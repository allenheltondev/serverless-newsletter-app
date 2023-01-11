const { Octokit } = require('octokit');
const { SFNClient, StartExecutionCommand } = require('@aws-sdk/client-sfn');
const shared = require('/opt/nodejs/index');

const sfn = new SFNClient();
let octokit;

exports.handler = async (event) => {
  try {
    await initializeOctokit();

    const recentCommits = await getRecentCommits();
    if (recentCommits.length) {
      const newContent = await getNewContent(recentCommits);
      if (newContent.length) {
        const data = await getContentData(newContent);
        await processNewContent(data);
      }
    }
  } catch (err) {
    console.error(err);
  }
};

const initializeOctokit = async () => {
  if (!octokit) {
    const gitHubSecret = await shared.getSecret('github');
    octokit = new Octokit({ auth: gitHubSecret });
  }
};

const getRecentCommits = async () => {
  const timeTolerance = Number(process.env.COMMIT_TIME_TOLERANCE_MINUTES);
  const date = new Date();
  date.setMinutes(date.getMinutes() - timeTolerance);

  const result = await octokit.rest.repos.listCommits({
    owner: process.env.OWNER,
    repo: process.env.REPO,
    path: process.env.PATH,
    since: date.toISOString()
  });

  const newPostCommits = result.data.filter(c => c.commit.message.toLowerCase().startsWith(process.env.NEW_CONTENT_INDICATOR));
  return newPostCommits.map(d => d.sha);
};

const getNewContent = async (commits) => {
  const newContent = await Promise.allSettled(commits.map(async (commit) => {
    const commitDetail = await octokit.rest.repos.getCommit({
      owner: process.env.OWNER,
      repo: process.env.REPO,
      ref: commit
    });

    const newFiles = commitDetail.data.files.filter(f => f.status == 'added' && f.filename.startsWith(`${process.env.PATH}/`));
    return newFiles.map(p => {
      return {
        fileName: p.filename,
        commit: commit
      }
    });
  }));

  let content = [];
  for (const result of newContent) {
    if (result.status == 'rejected') {
      console.error(result.reason);
    } else {
      content = [...content, ...result.value];
    }
  }

  return content;
};

const getContentData = async (newContent) => {
  const contentData = await Promise.allSettled(newContent.map(async (content) => {
    const postContent = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
      owner: process.env.OWNER,
      repo: process.env.REPO,
      path: content.fileName
    });

    const buffer = Buffer.from(postContent.data.content, 'base64');
    const data = buffer.toString('utf8');

    return {
      fileName: content.fileName,
      commit: content.commit,
      content: data
    };
  }));

  let allContent = [];
  for (const result of contentData) {
    if (result.status == 'rejected') {
      console.error(result.reason);
    } else {
      allContent.push(result.value);
    }
  }

  return allContent;
};

const processNewContent = async (newContent) => {
  const executions = await Promise.allSettled(newContent.map(async (content) => {
    const command = new StartExecutionCommand({
      stateMachineArn: process.env.STATE_MACHINE_ARN,
      input: JSON.stringify(content)
    });
    await sfn.send(command);
  }));

  for (const execution of executions) {
    if (execution.status == 'rejected') {
      console.error(execution.reason);
    }
  }
};