plugins {
    `java-library`
    id("com.vanniktech.maven.publish") version "0.37.0"
}

group = "io.github.tacocarlos"
version = "0.0.1"
description = "Unofficial client for the UIL Computer Science problems API at api.lunaghs.dev. Not affiliated with or endorsed by UIL."

repositories { mavenCentral() }

val jacksonVersion = "2.21.6"

dependencies {
    api("com.fasterxml.jackson.core:jackson-databind:$jacksonVersion")
    implementation("com.fasterxml.jackson.datatype:jackson-datatype-jsr310:$jacksonVersion")
    compileOnly("jakarta.annotation:jakarta.annotation-api:2.1.1")

    testImplementation(platform("org.junit:junit-bom:5.13.4"))
    testImplementation("org.junit.jupiter:junit-jupiter")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

// Java 11 bytecode and APIs (the generated client uses java.net.http), built
// with whatever JDK runs Gradle.
tasks.withType<JavaCompile>().configureEach { options.release = 11 }

tasks.test { useJUnitPlatform() }

// Generated sources carry javadoc the strict doclint rejects.
tasks.javadoc { (options as StandardJavadocDocletOptions).addStringOption("Xdoclint:none", "-quiet") }

// Maven Central: `./gradlew publishAndReleaseToMavenCentral`, with credentials
// and the signing key supplied as ORG_GRADLE_PROJECT_* environment variables
// (see .github/workflows/sdks.yml). Sources and javadoc jars are included.
mavenPublishing {
    publishToMavenCentral()
    signAllPublications()
    coordinates("io.github.tacocarlos", "luna-cs-uil", version.toString())
    pom {
        name = "luna-cs-uil"
        description = project.description
        url = "https://github.com/tacocarlos/cs-uil-api"
        licenses {
            license {
                name = "MIT License"
                url = "https://opensource.org/license/mit"
            }
        }
        developers {
            developer {
                id = "tacocarlos"
                name = "Carlos Luna"
                url = "https://github.com/tacocarlos"
            }
        }
        scm {
            url = "https://github.com/tacocarlos/cs-uil-api"
            connection = "scm:git:https://github.com/tacocarlos/cs-uil-api.git"
            developerConnection = "scm:git:ssh://git@github.com/tacocarlos/cs-uil-api.git"
        }
    }
}
