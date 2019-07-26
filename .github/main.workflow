workflow "Build and Publish" {
  on = "schedule(0 0 * * *)"
  resolves = ["Build", "Commit", "Publish"]
}

action "Build" {
  uses = "actions/npm@master"
  args = "install && npm run build"
}

action "Commit" {
  uses = "actions/npm@master"
  args = "run commit"
}

action "Publish" {
  uses = "actions/npm@master"
  args = "publish"
  secrets = ["NPM_AUTH_TOKEN"]
}