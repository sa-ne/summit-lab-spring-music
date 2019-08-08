pipeline {
	agent {
		label 'maven'
	}

	environment {
		BUILD_VERSION = "1.0.0.${currentBuild.number}"
	}

	stages {
		stage('Build App') {
			steps {
				sh "mvn versions:set clean package -DnewVersion=${env.BUILD_VERSION} -DskipTests"
			}
		}

		stage('Unit Test') {
		  steps {
		  	sh "mvn versions:set verify -DnewVersion=${env.BUILD_VERSION}"
		  }
		}

		stage('Sonar Scan') {
			steps {
				sh "mvn versions:set sonar:sonar -Dsonar.host.url=http://sonarqube.labs-infra.svc:9000 -DskipTests -DnewVersion=${env.BUILD_VERSION} -P sonar -s misc/config/settings.xml"
			}
		}

		stage('Publish Artifact') {
			steps {
				sh "mvn versions:set deploy -DskipTests -Dmaven.install.skip=true -DnewVersion=${env.BUILD_VERSION} -DaltDeploymentRepository=libs-snapshot::default::http://nexus.labs-infra.svc:8081/repository/libs-snapshot/ -s misc/config/settings.xml"
			}
		}

		stage('Build Image') {
			steps {
				script {
					openshift.withCluster() {
						openshift.withProject() {
							openshift.startBuild("spring-music", "--from-file=target/summit-lab-spring-music-${env.BUILD_VERSION}.jar").logs("-f")
						}
					}
				}
			}
		}

		stage('Deploy') {
			steps {
				script {
					openshift.withCluster() {
						openshift.withProject() {
							dc = openshift.selector("dc", "spring-music")
							dc.rollout().latest()
							timeout(10) {
								dc.rollout().status()
							}
						}
					}
				}
			}
		}

		stage('Integration Test') {
			steps {
				script {
					sh "curl -s http://spring-music:8080/actuator/health | grep 'UP'"
				}
			}
		}

		/*stage('Push to Quay') {
			steps {
				script {
					sh "whoami"
					writeFile file: '~/.docker/config.json', text: '''{"auths": {"quay.io": {"auth": "ZWRlYW5kcmVhK3Rlc3Q6TlZVR0ZFVlJNWlNEUDFZWFpYQjZRWVZTWFlHNERPTzNSVVBSRDAxN0VEMklFQTRQTEJQRDJJMzdTRzZKN1pSOA==","email": ""}}}'''
					//sh "oc extract -n default secrets/registry-certificates --keys=registry.crt"
					//sh "mkdir -p /etc/docker/certs.d/172.30.213.47"
					//sh "mv registry.crt /etc/docker/certs.d/172.30.213.47/redhat-ca.crt"
          //sh "oc image mirror 172.30.213.47:5000/dev/spring-music:latest quay.io/edeandrea/spring-music:latest"
					//sh "sudo mkdir -p /etc/docker/certs.d/docker-registry-default.apps.test-cea9.openshiftworkshop.com"
					//sh "mv registry.crt /etc/docker/certs.d/docker-registry-default.apps.test-cea9.openshiftworkshop.com/redhat-ca.crt"
					//sh "oc image mirror docker-registry-default.apps.test-cea9.openshiftworkshop.com:5000/dev/spring-music:latest quay.io/edeandrea/spring-music:latest"
				}
			}
		}*/

		stage('Promote to Prod') {
			steps {
				timeout(time:15, unit:'MINUTES') {
					input message: "Approve Promotion to Prod?", ok: "Promote"
				}

				script {
					openshift.withCluster() {
						openshift.tag("dev/spring-music:latest", "prod/spring-music:prod")
					}
				}
			}
		}

		stage('Deploy to Prod') {
			steps {
				script {
					openshift.withCluster() {
						openshift.withProject('prod') {
							def dc = openshift.selector("dc", "spring-music")

							if (!dc.exists()) {
								def app = openshift.newApp("spring-music:prod")
								dc = app.narrow("dc")
								def dcmap = dc.object()

								def envList = []
								envList << [
									"name": "DB_NAME",
									"valueFrom": [
										"secretKeyRef": [
											"name": "summit-lab-spring-music-db",
											"key": "database-name"
										]
									]
								]

								envList << [
									"name": "SPRING_DATASOURCE_USERNAME",
									"valueFrom": [
										"secretKeyRef": [
											"name": "summit-lab-spring-music-db",
											"key": "database-user"
										]
									]
								]

								envList << [
									"name": "SPRING_DATASOURCE_PASSWORD",
									"valueFrom": [
										"secretKeyRef": [
											"name": "summit-lab-spring-music-db",
											"key": "database-password"
										]
									]
								]

								envList << [
									"name": "SPRING_DATASOURCE_URL",
									"value": "jdbc:postgresql://summit-lab-spring-music-db/\$(DB_NAME)"
								]

								def container = dcmap.spec.template.spec.containers[0]
								container['env'] = envList

								container.livenessProbe = [
									"failureThreshold": 3,
									"httpGet": [
										"path": "/actuator/health",
										"port": 8080,
										"scheme": "HTTP"
									],
									"initialDelaySeconds": 30,
									"periodSeconds": 10,
									"successThreshold": 1,
									"timeoutSeconds": 10
								]

								container.readinessProbe = [
									"failureThreshold": 3,
									"httpGet": [
										"path": "/actuator/health",
										"port": 8080,
										"scheme": "HTTP"
									],
									"initialDelaySeconds": 30,
									"periodSeconds": 10,
									"successThreshold": 1,
									"timeoutSeconds": 10
								]

								container.resources = [
									"limits": [
										"cpu": "2"
									],
									"requests": [
										"cpu": "500m",
										"memory": "512Mi"
									]
								]

								openshift.apply(dcmap)
								app.narrow("svc").expose()
							}

							timeout(10) {
								dc.rollout().status()
							}
						}
					}
				}
			}
		}
	}
}
