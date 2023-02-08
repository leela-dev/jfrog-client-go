package jfrogclient

import "fmt"

var agentName = "jfrog-client-go"
var agentVersion = "1.7.0"

func GetVersion() string {
	return agentVersion
}

// Dummy build 5
func GetName() string {
	return agentName
}

func GetUserAgent() string {
	return fmt.Sprintf("%s/%s", agentName, agentVersion)
}

func SetAgentName(name string) {
	agentName = name
}
