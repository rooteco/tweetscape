import fs from 'fs/promises';

import Bottleneck from 'bottleneck';
import { LinearClient } from '@linear/sdk';
import { Octokit } from 'octokit';

const GITHUB_FILE = 'github.json';
const NODES_FILE = 'nodes.json';
const LINEAR_API_KEY = 'TODO: Insert your Linear API key here.';
const GH_PRIVATE_TOKEN = 'TODO: Insert your private GitHub access token here.';
const GH_ORG = 'rooteco';
const GH_REPO = 'tweetscape';
const USERS = {
  '3a265428-dcdd-470c-9f0e-13a5c6bb99d3': 'ntorba',
  'b71ded2e-3614-407b-b4ab-aeb750bc9cb2': 'nicholaschiang',
  '5f775500-a81d-4e72-9f4d-11255fdcc2ff': 'RhysLindmark',
  '58439d0b-ef8f-4457-816a-c5d67d675ade': 'brendon-wong',
};

const linear = new LinearClient({ apiKey: LINEAR_API_KEY });
const gh = new Octokit({ auth: GH_PRIVATE_TOKEN });
const limiter = new Bottleneck({
  minTime: 2000,
  maxConcurrent: 1,
  trackDoneStatus: true,
});

async function fetchIssues() {
  const nodes = [];
  let hasNextPage = true;
  let endCursor;
  while (hasNextPage) {
    const { data } = await linear.client.rawRequest(`
      query {
        issues(
          first: 50,
          ${endCursor ? `after: "${endCursor}",` : ''}
          filter: { team: { name: { eq: "Tweetscape" } } }
        ) {
          nodes {
            id
            identifier
            url
            title
            description
            priority
            priorityLabel
            createdAt
            archivedAt
            estimate
            creator { id }
            assignee { id }
            labels {
              nodes {
                id
                name
              }
            }
            comments {
              nodes {
                body
                createdAt
                user {
                  id
                }
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `);
    console.log(`Fetched ${data.issues.nodes.length} issues.`);
    hasNextPage = data.issues.pageInfo.hasNextPage;
    endCursor = data.issues.pageInfo.endCursor;
    data.issues.nodes.forEach((node) => nodes.push(node));
  }
  await fs.writeFile(NODES_FILE, JSON.stringify(nodes, null, 2));
}

async function importIssues() {
  const nodes = JSON.parse((await fs.readFile(NODES_FILE)).toString());
  const github = JSON.parse((await fs.readFile(GITHUB_FILE)).toString());
  const issues = nodes
    .sort((a, b) => a.number - b.number)
    .map((i) => ({
      owner: GH_ORG,
      repo: GH_REPO,
      title: i.title,
      body: `*Imported from @${USERS[i.creator.id]}'s original Linear issue [${
        i.identifier
      }](${i.url}).*\n\n${i.description ?? ''}`,
      labels: [
        i.priorityLabel,
        `E${i.estimate ?? 0}`,
        ...i.labels.nodes.map((l) => l.name),
      ],
      assignees: i.assignee ? [USERS[i.assignee.id]] : [],
      comments: i.comments.nodes.map((c) => ({
        body: `From @${USERS[c.user.id]} on ${new Date(
          c.createdAt
        ).toLocaleString('en-US', {
          weekday: 'long',
          year: '2-digit',
          month: 'numeric',
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
          timeZoneName: 'short',
        })}:\n\n${c.body}`,
      })),
    }));
  const comments = issues.map((i) => i.comments).flat();
  console.log(`Creating ${issues.length} issues...`);
  console.log(`Creating ${comments.length} comments...`);
  await Promise.all(
    issues.map(async (issue) => {
      if (github.some((i) => issue.title === i.title))
        return console.log(`Issue already exists... (${issue.title})`);
      const created = await limiter.schedule(async () => {
        console.log(`Creating issue... (${issue.title})`);
        const { data: created } = await gh.rest.issues.create(issue);
        github.push(created);
        await fs.writeFile(GITHUB_FILE, JSON.stringify(github, null, 2));
        return created;
      });
      await Promise.all(
        issue.comments.map(async (comment) => {
          await limiter.schedule(() => {
            console.log(`Creating issue #${created.number} comment...`);
            return gh.rest.issues.createComment({
              owner: GH_ORG,
              repo: GH_REPO,
              issue_number: created.number,
              body: comment.body,
            });
          });
        })
      );
    })
  );
  console.log(`Done! Check: https://github.com/${GH_ORG}/${GH_REPO}/issues`);
}

(async () => {
  const intervalId = setInterval(() => {
    const c = limiter.counts();
    const msg =
      `GitHub API calls: ${c.RECEIVED} received, ${c.QUEUED} queued, ` +
      `${c.RUNNING} running, ${c.EXECUTING} executing, ${c.DONE} done.`;
    console.log(msg);
  }, 2500);
  await importIssues();
  clearInterval(intervalId);
})();
