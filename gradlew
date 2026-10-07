#!/bin/sh
DIR="$(cd "$(dirname "$0")" && pwd)"
JAR="$DIR/gradle/wrapper/gradle-wrapper.jar"
java -classpath "$JAR" org.gradle.wrapper.GradleWrapperMain "$@"
