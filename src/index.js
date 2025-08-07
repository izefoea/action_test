#!/usr/bin/env node
import { Octokit } from '@octokit/rest';
import PRChecker from './pr_checker.js';

async function main() {
  const argv = require('yargs')
    .option('owner', { type: 'string', demandOption: true })
    .option('repo',  { type: 'string', demandOption: true })
    .option('pr',    { type: 'number', demandOption: true })
    .option('ciType',{ type: 'string', default: 'NODEJS' })
    .argv;

  // 1. Initialize GitHub client
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

  // 2. Fetch PR data
  const [prRes, reviewersRes, commentsRes, reviewsRes, commitsRes, collabsRes] = await Promise.all([
    octokit.pulls.get({ owner: argv.owner, repo: argv.repo, pull_number: argv.pr }),
    octokit.pulls.listReviewers({ owner: argv.owner, repo: argv.repo, pull_number: argv.pr }),
    octokit.issues.listComments({ owner: argv.owner, repo: argv.repo, issue_number: argv.pr }),
    octokit.pulls.listReviews({ owner: argv.owner, repo: argv.repo, pull_number: argv.pr }),
    octokit.pulls.listCommits({ owner: argv.owner, repo: argv.repo, pull_number: argv.pr }),
    octokit.repos.listCollaborators({ owner: argv.owner, repo: argv.repo })
  ]);

  // 3. Shape the `data` object to match what PRChecker expects
  const data = {
    pr:            { /* map prRes.data */ },
    reviewers:     reviewersRes.data,
    comments:      commentsRes.data,
    reviews:       reviewsRes.data,
    commits:       commitsRes.data,
    collaborators: new Map(collabsRes.data.map(u => [u.login, u])),
  };

  // 4. Instantiate and run checks
  const checker = new PRChecker(console, data, octokit, argv);
  const success = await checker.checkAll(/* checkComments? */ true);

  process.exit(success ? 0 : 1);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
