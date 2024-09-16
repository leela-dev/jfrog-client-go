const tasks = require('jfrog-pipelines-tasks')

module.exports = {
  readInputs,
  setupFrogbotEnvironment,
  PrepareFrogbotEnvironment,
  DownloadBinary,
  RunFrogbot,
  readFromGenericIntegration,
}

/**
 * Performs required steps to execute task
 * @returns {*}
 */
async function executeTask() {
  let inputs;
  try {
    // Read inputs
    inputs = readInputs()
  } catch (e) {
    return e
  }
  // Prepare required environment variables for Frogbot setup
  const frogbot = PrepareFrogbotEnvironment(inputs)
  // Set up frogbot environment with required variables
  setupFrogbotEnvironment(frogbot)
  tasks.info("Completed setting up frogbot environment.")
  // Download the binary
  await DownloadBinary()
  tasks.info("Downloaded binary successfully")
  // Run the binary with required options
  await RunFrogbot(inputs)
}

/**
 * Read task inputs, validates inputs.
 * @returns inputs
 * @throw mandatory inputs missing
 */
 function readInputs() {
  tasks.info("Reading task inputs")
  const repoName = tasks.getInput('repository')
  const accessTokenValue = tasks.getInput('accessToken')
  const gitToken = tasks.getInput('gitToken')
  const gitProvider = tasks.getInput('provider')
  const gitEndPoint = tasks.getInput('endPoint')
  const botAction = tasks.getInput('botAction')
  const platformURL = tasks.getInput('platformURL')
  const botVersion = tasks.getInput('version')
  const pullRequestID = tasks.getInput('pullRequestID')
  try {
     validateInputs(repoName, accessTokenValue, gitToken, gitProvider, gitEndPoint, botAction, platformURL, botVersion, pullRequestID);
  } catch (e) {
    return e
  }
  return {repoName, accessTokenValue, gitToken, gitProvider, gitEndPoint, botAction, platformURL, botVersion, pullRequestID};
}

/**
 * Validates inputs received for the task.
 * @throw mandatory inputs missing
 */
 function validateInputs(repository, accessToken, gitToken, gitProvider, gitEndPoint, botAction, jPURL, botVersion, pullRequestID) {
  tasks.debug("Inputs received\n"+"Repository:"+repository+"\naccessToken:"+accessToken+"\ngitToken:"+gitToken+
    "\ngitProvider:"+gitProvider+"\ngitEndPoint:"+gitEndPoint+"\nbotAction:"+botAction+"\nPlatformURL:"+jPURL+"\nversion:"+botVersion+"\npullRequestID:"+pullRequestID)
  if (repository === ""
    || accessToken === ""
    || gitToken === ""
    || gitProvider === ""
    || gitEndPoint === ""
    || botAction === ""
    || jPURL === ""){
    throw new Error("Mandatory inputs are missing. Please verify frogbot task inputs.")
  }
}

/**
 * Prepares object with key value pairs. Sets frogbot expected
 * environment variable as key and relative input as value.
 * @params inputs
 * @returns {JF_URL: (string|*), JF_GIT_PROVIDER: (string|*), JF_GIT_API_ENDPOINT: (string|*), JF_ACCESS_TOKEN: string, JF_GIT_TOKEN: string, JF_GIT_REPO: string, JF_GIT_PULL_REQUEST_ID: (string|*), JF_GIT_OWNER: string, JF_INSTALL_DEPS_CMD: string}
 */
 function PrepareFrogbotEnvironment(inputs) {
  const fullRepo = String(inputs.repoName).split("/", 2)
  const accessTokenSecret = readFromGenericIntegration(inputs.accessTokenValue, "accessToken")
  const gitTokenSecret = readFromGenericIntegration(inputs.gitToken, "token")
  return {
    'JF_GIT_REPO': fullRepo[1],
    'JF_GIT_OWNER': fullRepo[0],
    'JF_ACCESS_TOKEN': accessTokenSecret,
    'JF_GIT_TOKEN': gitTokenSecret,
    'JF_GIT_PROVIDER': inputs.gitProvider,
    'JF_GIT_API_ENDPOINT': inputs.gitEndPoint,
    'JF_GIT_PULL_REQUEST_ID': inputs.pullRequestID,
    'JF_URL': inputs.platformURL,
    'JF_INSTALL_DEPS_CMD': "jf npmc "+tasks.getVariable("RESOLVE_REPO")
  }
}

/**
 * Exports all property values present in frogbot object
 * @params frogbot
 */
function setupFrogbotEnvironment(frogbot){
  for (const property in frogbot) {
    tasks.exportEnvironmentVariable(`${property}`, `${frogbot[property]}`)
  }
}

/**
 * Downloads frogbot binary based on operating system family
 */
async function DownloadBinary() {
  const path = tasks.getVariable("EXECUTION_PATH")
  tasks.debug("Execution path defined as:" + path)
  let command;
  if (isWindows()) {
    command = `iwr https://releases.jfrog.io/artifactory/frogbot/v2/[RELEASE]/frogbot-windows-amd64/frogbot.exe -OutFile frogbot.exe`
  } else {
    command = `cd ${path} && curl -fLg "https://releases.jfrog.io/artifactory/frogbot/v2/[RELEASE]/getFrogbot.sh" | sh`
  }
  try {
    const {stdOut, stdErr} = await tasks.execute(command);
    if (stdErr) {
      tasks.error(stdErr.toString())
    } else if (stdOut) {
      tasks.info(stdOut.toString())
    }
  } catch (e) {
    tasks.error(e.toString())
    throw new Error(e)
  }
}

/**
 * Run frogbot binary with given argument via inputs.botAction and print the results
 */
async function RunFrogbot(inputs) {
  const binary = getExecutableName()
  tasks.info("Running frogbot scan... using:"+binary)
  try {
    const path = tasks.getVariable("EXECUTION_PATH")
    const {stdout, stderr} = (await tasks.execute(`cd ${path} && ${binary} ${inputs.botAction}`))
    tasks.info(stderr)
    tasks.info(stdout)
  } catch (e) {
    throw new Error(e)
  }
}

/**
 * Returns executable name based on OS family
 * @returns {string}
 */
 function getExecutableName() {
  return  isWindows() ? "frogbot.exe" : "./frogbot";
}

/**
 * Returns true OS family is WINDOWS otherwise false
 * @returns {boolean}
 */
 function isWindows(){
  return tasks.getOperatingSystemFamily().toLowerCase().startsWith("windows", 0)
}

/**
 * Retrieves generic integration and fetches variable passed as @param tokenName
 * @param integrationName
 * @param tokenName
 * @returns {string}
 */
function readFromGenericIntegration(integrationName, tokenName) {
  tasks.info("reading from generic integration")
  let integration
  try {
    integration = tasks.getIntegration(integrationName)
  } catch (e) {
    tasks.error('failed to fetch integration: '+integrationName)
    throw new Error(e)
  }
  const tokenValue = integration.getValue(tokenName)
  if (tokenValue === '') {
    throw new Error("unable to find token with given name please check input token provided")
  }
  return tokenValue
}

if (require.main === module) {
  executeTask()
}