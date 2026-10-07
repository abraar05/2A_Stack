pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}
rootProject.name = "2A_Stack"
include(":shared")
project(":shared").projectDir = file("android/shared")
include(":apps:distro")
include(":apps:people")
include(":apps:logistics")
include(":apps:portal")
include(":apps:crm")
