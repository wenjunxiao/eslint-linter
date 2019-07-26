require("shelljs/make");

const fs = require('fs');
const path = require('path');
const eslint = require('eslint');
const execSync = require('child_process').execSync;

const {
  cd,
  mkdir,
  pwd,
  test
} = require("shelljs");

const pkgVersion = require('./package.json').version;

const version = eslint.CLIEngine.version;
const ESLINT_DIR = path.resolve(__dirname, '.eslint');
const ESLINT_GIT = 'https://github.com/eslint/eslint.git';
const BUILD_DIR = path.resolve(__dirname, 'lib');

function getBinFile(command) {
  return path.join('node_modules', '.bin', command);
}

function exec(command, opts) {
  opts = opts || {};
  if (opts.silent) {
    opts.stdio = ['pipe', 'pipe', 'pipe'];
  } else {
    opts.stdio = ['pipe', process.stdout, process.stderr];
  }
  return execSync(command, opts);
}

function output(...args) {
  args[0] = '[Make] ' + (args[0] || '')
  console.error.apply(console, args);
}

target.all = function (mode = 'production') {
  target.build(mode);
  target.commit();
}

target.pull = function (url) {
  url = url || ESLINT_GIT;
  if (!test("-d", ESLINT_DIR)) {
    exec(`git clone ${url} ${ESLINT_DIR}`);
  } else {
    const currentDir = pwd();
    cd(ESLINT_DIR);
    output('fetch eslint ...')
    exec('git fetch origin');
    output('fetch eslint done.')
    cd(currentDir);
  }
}

target.build = function (mode = 'production') {
  const currentDir = pwd();
  cd(ESLINT_DIR);
  output(`checkout 'v${version}'`);
  target.pull();
  exec(`git checkout v${version}`);
  output(`installing dependencies...`);
  exec(`npm install`);
  output(`building ...`);
  if (!test('-d', BUILD_DIR)) {
    mkdir('-p', BUILD_DIR);
  }
  // exec(`npm run webpack -- -- production`);
  exec(`${getBinFile("webpack")} --mode=${mode} --output-path=${BUILD_DIR}`);
  output(`build done.`);
  cd(currentDir);
}

target.commit = function (message) {
  const pmv = pkgVersion.split('.')[0];
  const mv = version.split('.')[0];
  const branch = exec('git symbolic-ref -q --short HEAD || git describe --tags --exact-match', {
    silent: true
  }).toString().trim();
  // different major version
  if (branch === 'master' && pmv !== mv) {
    const vs = pmv + '.x';
    exec(`git checkout -b ${vs} && git push origin ${vs}:${vs} && git checkout master`);
  }
  // different version
  if (pkgVersion !== version) {
    const pkgFile = path.resolve(__dirname, 'package.json');
    const reg = new RegExp(`("version":\\s*")${pkgVersion.replace(/\./g, '\\\.')}(",)`);
    fs.writeFileSync(pkgFile, fs.readFileSync(pkgFile).toString().replace(reg, `$1${version}$2`));
    exec('git add .');
    exec(`git commit -m 'v${version}'`);
    try {
      exec(`git tag v${version}`, {
        silent: true
      });
    } catch (err) {
      output(err.message)
    }
  } else {
    exec('git add .');
    exec(`git commit -m '${message || 'fix and patch'}'`);
  }
  exec(`git push origin ${branch} --tags`);
}