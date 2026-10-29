plugins {
    `java-library`
    `maven-publish`
}

group = "io.github.tacocarlos"
version = "0.0.1"
description = "Unofficial client for the UIL Computer Science problems API at api.lunaghs.dev. Not affiliated with or endorsed by UIL."

java {
    withSourcesJar()
    withJavadocJar()
}

// Java 11 bytecode and APIs (the generated client uses java.net.http), built
// with whatever JDK runs Gradle.
tasks.withType<JavaCompile>().configureEach { options.release = 11 }

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

tasks.test { useJUnitPlatform() }

// Generated sources carry javadoc the strict doclint rejects.
tasks.javadoc { (options as StandardJavadocDocletOptions).addStringOption("Xdoclint:none", "-quiet") }

publishing {
    publications {
        create<MavenPublication>("maven") {
            artifactId = "luna-cs-uil"
            from(components["java"])
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
                developers { developer { name = "Carlos Luna" } }
                scm { url = "https://github.com/tacocarlos/cs-uil-api" }
            }
        }
    }
}
