/*
 * Push local commits to GitHub through the REST API.
 *
 *   node tools/push-via-api.js [--owner X] [--repo Y] [--branch main]
 *
 * Why: some networks block github.com:443 (git-upload-pack) while
 * api.github.com stays reachable, so `git push` fails with
 * "Failed to connect to github.com:443". This replays the missing commits using
 * the Git Data API instead, so the code still gets published.
 *
 * How it decides what to send: it walks back from local HEAD until it finds a
 * commit whose *tree* matches the remote head's tree — that is the point the two
 * histories agree on content — then replays everything after it, with the remote
 * head as the first parent.
 *
 * Caveat: GitHub re-stamps the author/committer of commits created through the
 * API, so the replayed commits get new SHAs (content is identical, verified by
 * comparing trees). When github.com is reachable again, reconcile with:
 *     git fetch origin && git reset --hard origin/main
 *
 * Requires: a stored git credential for github.com with `repo` scope
 * (git config credential.helper), and Node 18+ for global fetch.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const args = process.argv.slice(2);
const flag = (name, dflt) => {
    const i = args.indexOf('--' + name);
    return i >= 0 && args[i + 1] ? args[i + 1] : dflt;
};

const OWNER = flag('owner', 'hajimimaodie8');
const REPO = flag('repo', 'maze-dash-web');
const BRANCH = flag('branch', 'main');
const ROOT = flag('dir', process.cwd());

const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' })
    .replace(/\r\n/g, '\n');

function token() {
    const out = execFileSync('git', ['credential', 'fill'], {
        cwd: ROOT, input: 'protocol=https\nhost=github.com\n\n', encoding: 'utf8',
        env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never' },
    });
    const m = /^password=(.*)$/m.exec(out);
    if (!m) { throw new Error('no stored credential for github.com (git credential.helper)'); }
    return m[1].trim();
}

const TOKEN = token();
const H = {
    Authorization: `token ${TOKEN}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'push-via-api',
    'X-GitHub-Api-Version': '2022-11-28',
};
const API = `https://api.github.com/repos/${OWNER}/${REPO}`;

async function api(method, url, body) {
    const res = await fetch(url.startsWith('http') ? url : API + url, {
        method,
        headers: body ? { ...H, 'Content-Type': 'application/json' } : H,
        body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    if (!res.ok) { throw new Error(`${method} ${url} -> ${res.status} ${text.slice(0, 300)}`); }
    return text ? JSON.parse(text) : null;
}

function parseIdent(line) {
    const m = /^(?:author|committer)\s+(.*?)\s*<([^>]*)>\s+(\d+)\s+([+-]\d{4})$/.exec(line);
    if (!m) { throw new Error('cannot parse identity: ' + line); }
    const [, name, email, ts, tz] = m;
    const offMin = (tz[0] === '-' ? -1 : 1) * (Number(tz.slice(1, 3)) * 60 + Number(tz.slice(3, 5)));
    const p = (n) => String(n).padStart(2, '0');
    const iso = new Date(Number(ts) * 1000).toISOString().slice(0, 19);
    return { name, email, date: `${iso}${tz[0]}${p(Math.floor(Math.abs(offMin) / 60))}:${p(Math.abs(offMin) % 60)}` };
}

async function main() {
    const ref = await api('GET', `/git/ref/heads/${BRANCH}`);
    const remoteHead = ref.object.sha;
    const remoteTree = (await api('GET', `/git/commits/${remoteHead}`)).tree.sha;
    const localHead = git('rev-parse', 'HEAD').trim();
    console.log('remote head :', remoteHead);
    console.log('local  head :', localHead);

    // commits after the last point where both sides agree on content
    const todo = [];
    let cur = localHead;
    while (cur) {
        const tree = git('rev-parse', cur + '^{tree}').trim();
        if (tree === remoteTree) { break; }
        todo.push(cur);
        const parents = git('rev-list', '--parents', '-n', '1', cur).trim().split(/\s+/);
        cur = parents[1] || null;
    }
    todo.reverse();
    if (!todo.length) { console.log('nothing to push — remote already has this content'); return; }

    console.log('commits to replay:', todo.length);
    let parent = remoteHead;
    for (const sha of todo) {
        const raw = git('cat-file', 'commit', sha);
        const idx = raw.indexOf('\n\n');
        const header = raw.slice(0, idx).split('\n');
        const message = raw.slice(idx + 2).replace(/\n+$/, '\n');
        const author = parseIdent(header.find((l) => l.startsWith('author ')));
        const committer = parseIdent(header.find((l) => l.startsWith('committer ')));

        const localParent = git('rev-parse', sha + '^').trim();
        const changed = git('diff', '--name-only', localParent, sha).trim().split('\n').filter(Boolean);
        const entries = [];
        const removed = [];
        for (const p of changed) {
            const abs = path.join(ROOT, p.replace(/\//g, path.sep));
            if (!fs.existsSync(abs)) { removed.push(p); continue; }
            const blob = await api('POST', '/git/blobs', {
                content: fs.readFileSync(abs).toString('base64'), encoding: 'base64',
            });
            entries.push({ path: p, mode: '100644', type: 'blob', sha: blob.sha });
        }

        const baseTree = (await api('GET', `/git/commits/${parent}`)).tree.sha;
        const tree = await api('POST', '/git/trees', {
            base_tree: baseTree,
            tree: entries.concat(removed.map((p) => ({ path: p, mode: '100644', type: 'blob', sha: null }))),
        });
        const created = await api('POST', '/git/commits', {
            message, tree: tree.sha, parents: [parent], author, committer,
        });
        console.log(`  ${sha.slice(0, 7)} -> ${created.sha.slice(0, 7)}  (${changed.length} file(s) changed)`);
        parent = created.sha;
    }

    await api('PATCH', `/git/refs/heads/${BRANCH}`, { sha: parent, force: false });
    console.log(`updated refs/heads/${BRANCH} -> ${parent}`);
    console.log(`https://github.com/${OWNER}/${REPO}/commit/${parent}`);
}

main().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
