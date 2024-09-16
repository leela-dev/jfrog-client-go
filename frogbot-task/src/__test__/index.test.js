const tasks = require('jfrog-pipelines-tasks')
const application = require('../index')

jest.mock('jfrog-pipelines-tasks')

describe('Tests for read input fields', (object, method) => {
  jest
    .spyOn(tasks, 'getInput')
    .mockImplementation((key) => {
      if (key === 'repository') {
        return 'user/frogbot'
      } else if (key === 'accessToken') {
        return 'jfrogAccessToken'
      } else if (key === 'gitToken') {
        return 'ghIntName'
      } else if (key === 'provider') {
        return 'github'
      } else if (key === 'endPoint') {
        return 'https://api.github.com'
      } else if (key === 'botAction') {
        return 'scan-pr'
      } else if (key === 'platformURL') {
        return 'https://test.jfrog.com'
      } else if (key === 'version') {
        return ''
      }
    })

  it('should be able to read inputs when provided and prepare object accordingly', () => {
    const inputs =  application.readInputs()
     expect(inputs.repoName).toEqual('user/frogbot')
     expect(inputs.accessTokenValue).toEqual('jfrogAccessToken')
     expect(inputs.gitToken).toEqual('ghIntName')
     expect(inputs.gitProvider).toEqual('github')
     expect(inputs.gitEndPoint).toEqual('https://api.github.com')
     expect(inputs.botAction).toEqual('scan-pr')
     expect(inputs.platformURL).toEqual('https://test.jfrog.com')
     expect(inputs.botVersion).toEqual('')
  })
})

describe('Tests for prepare frogbot environment', (object, method) => {
  let integration = {
    getValue: (name) => {
      if (name === 'accessToken') {
        return 'csvpkwgnekrjngkrejgnk'
      } else if (name === 'token')
        return 'gh_ighrxzvtgwerderiedlkngdawpoekmglkgskdjfgkg';
    },
  }

  jest
    .spyOn(tasks, "getIntegration")
    .mockImplementation((key) => {
      return integration
    })

  const inputs =
  {
    repoName: 'user/frogbot',
    accessTokenValue: 'jfrogAccessToken',
    gitToken: 'ghIntName',
    gitProvider: 'github',
    gitEndPoint: 'https://api.github.com',
    botAction: 'scan-pr',
    platformURL: 'https://test.jfrog.com',
    pullRequestID: '2345'
  }
  it('should be able to read inputs when provided and prepare object accordingly', () => {
    const frogEnv = application.PrepareFrogbotEnvironment(inputs)
    expect(frogEnv['JF_GIT_REPO']).toEqual('frogbot')
    expect(frogEnv['JF_GIT_OWNER']).toEqual('user')
    expect(frogEnv['JF_ACCESS_TOKEN']).toEqual('csvpkwgnekrjngkrejgnk')
    expect(frogEnv['JF_GIT_TOKEN']).toEqual('gh_ighrxzvtgwerderiedlkngdawpoekmglkgskdjfgkg')
    expect(frogEnv['JF_GIT_PROVIDER']).toEqual('github')
    expect(frogEnv['JF_GIT_API_ENDPOINT']).toEqual('https://api.github.com')
    expect(frogEnv['JF_GIT_PULL_REQUEST_ID']).toEqual('2345')
  })
})

describe("Tests for Download binary", (object, method) => {
  jest
    .spyOn(tasks, "getVariable")
    .mockImplementation( (key) => {
      if (key === "EXECUTION_PATH") {
        return "resource/src"
      }
    })

  it('should be able to download binary for non windows', async () => {
    const mockedExecute = jest
      .spyOn(tasks, 'execute')
      .mockResolvedValue("Downloaded sucessfully")
    jest
      .spyOn(tasks, 'getOperatingSystemFamily')
      .mockImplementation(() => {
        return "linux"
      })
    await application.DownloadBinary()
    expect(mockedExecute).toHaveBeenCalledWith("cd resource/src && curl -fLg \"https://releases.jfrog.io/artifactory/frogbot/v2/[RELEASE]/getFrogbot.sh\" | sh")
  })

  it('should be able to download binary for any platform', async () => {
    const mockedExecute = jest
      .spyOn(tasks, 'execute')
      .mockResolvedValue("Downloaded successfully");

    jest
      .spyOn(tasks, 'getOperatingSystemFamily')
      .mockImplementation(() => {
        return "windows"
      })

    await application.DownloadBinary()
    expect(mockedExecute).toHaveBeenCalledWith("iwr https://releases.jfrog.io/artifactory/frogbot/v2/[RELEASE]/frogbot-windows-amd64/frogbot.exe -OutFile frogbot.exe")
  })

  it('should throw error when task execute fails', async () => {
    const mockedExecute = jest
      .spyOn(tasks, 'execute')
      .mockImplementation((key) => {
        throw new Error("failed to download")
      });

    jest
      .spyOn(tasks, 'getOperatingSystemFamily')
      .mockImplementation(() => {
        return "windows"
      })

    expect(async () => await application.DownloadBinary().toThrowError("failed to download"))
  })
})

describe("Tests for Running Frogbot", () => {
  jest
    .spyOn(tasks, "getVariable")
    .mockImplementation( (key) => {
      if (key === "EXECUTION_PATH") {
        return "resource/src"
      }
    })

  it("Should execute with correct command for non windows platforms", async() => {

    jest
      .spyOn(tasks, 'getOperatingSystemFamily')
      .mockImplementation(() => {
        return "linux"
      })

    const mockedExecute = jest
      .spyOn(tasks, 'execute')
      .mockResolvedValue("Executed successfully");

    const inputs =
      {
        repoName: 'user/frogbot',
        accessTokenValue: 'jfrogAccessToken',
        gitToken: 'ghIntName',
        gitProvider: 'github',
        gitEndPoint: 'https://api.github.com',
        botAction: 'scan-pull-request',
        platformURL: 'https://test.jfrog.com',
        pullRequestID: '2345'
      }

    await application.RunFrogbot(inputs)

    expect(mockedExecute).toHaveBeenCalledWith("cd resource/src && ./frogbot scan-pull-request")
  })

  it("Should throw error when tasks execute fails", async() => {

    jest
      .spyOn(tasks, 'getOperatingSystemFamily')
      .mockImplementation(() => {
        return "linux"
      })

    const mockedExecute = jest
      .spyOn(tasks, 'execute')
      .mockImplementation(() => {
        throw new Error("Failed to execute")
      })

    const inputs =
      {
        repoName: 'user/frogbot',
        accessTokenValue: 'jfrogAccessToken',
        gitToken: 'ghIntName',
        gitProvider: 'github',
        gitEndPoint: 'https://api.github.com',
        botAction: 'scan-pull-request',
        platformURL: 'https://test.jfrog.com',
        pullRequestID: '2345'
      }

    expect(async () => await application.RunFrogbot().toThrowError("Failed to execute"))
  })
})