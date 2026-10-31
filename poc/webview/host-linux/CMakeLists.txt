cmake_minimum_required(VERSION 3.21)
project(spw-folia-host LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTORCC ON)
set(CMAKE_AUTOUIC ON)

find_package(Qt6 REQUIRED COMPONENTS Core Gui Widgets WebEngineWidgets)
find_package(PkgConfig REQUIRED)
pkg_check_modules(PIPEWIRE REQUIRED IMPORTED_TARGET libpipewire-0.3)

add_executable(spw-folia-host main.cpp pipewire_audio.cpp)
target_link_libraries(spw-folia-host PRIVATE Qt6::Core Qt6::Gui Qt6::Widgets Qt6::WebEngineWidgets PkgConfig::PIPEWIRE)
install(TARGETS spw-folia-host RUNTIME DESTINATION .)
