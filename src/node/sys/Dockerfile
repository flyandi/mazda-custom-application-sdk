# Custom Applications SDK for Mazda Connect Infotainment System
#
# A mini framework that allows to write custom applications for the Mazda Connect Infotainment System
# that includes an easy to use abstraction layer to the JCI system.
#
# Written by Andreas Schwarz (http://github.com/flyandi/mazda-custom-application-sdk)
# Copyright (c) 2016. All rights reserved.
#
# WARNING: The installation of this application requires modifications to your Mazda Connect system.
# If you don't feel comfortable performing these changes, please do not attempt to install this. You might
# be ending up with an unusuable system that requires reset by your Dealer. You were warned!
#
# This program is free software: you can redistribute it and/or modify it under the terms of the
# GNU General Public License as published by the Free Software Foundation, either version 3 of the
# License, or (at your option) any later version.
#
# This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even
# the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
# License for more details.
#
# You should have received a copy of the GNU General Public License along with this program.
# If not, see http://www.gnu.org/licenses/
#

#
# Docker Build Environment for CASDK-NODE
#
FROM ubuntu:14.04.5
MAINTAINER Andy <flyandi@yahoo.com>

# Configuration
ENV NODE_VERSION=6.6.0

# Setup Enviroment Variables
WORKDIR /armv7l
ENV PKG_CONFIG_PATH=/usr/bin/arm-linux-gnueabihf-pkg-config
ENV CC=/usr/bin/arm-linux-gnueabihf-gcc
ENV CXX=/usr/bin/arm-linux-gnueabihf-g++
ENV AR=/usr/bin/arm-linux-gnueabihf-ar
ENV RANLIB=/usr/bin/arm-linux-gnueabihf-ranlib
ENV LINK="${CXX}"
ENV CCFLAGS="-Wl,--build-id=none"
ENV CXXFLAGS=""
ENV NODE_SOURCE_PACKAGE=node-v${NODE_VERSION}

# Install System Tools
RUN \
  apt-get update \
  && apt-get install -y --no-install-recommends \
    build-essential \
    gcc-arm-linux-gnueabihf \
    g++-arm-linux-gnueabihf \
    binutils-arm-linux-gnueabihf \
    python \
    wget \
  && apt-get clean

# Download latest node
RUN wget --no-check-certificate https://nodejs.org/dist/v${NODE_VERSION}/${NODE_SOURCE_PACKAGE}.tar.gz

# Extract
RUN tar xvzf ${NODE_SOURCE_PACKAGE}.tar.gz

# Prepare
RUN cd ${NODE_SOURCE_PACKAGE}

# Change work dir
WORKDIR /armv7l/${NODE_SOURCE_PACKAGE}


# Configure
RUN ./configure --without-snapshot --dest-cpu=arm --dest-os=linux --fully-static --without-ssl --tag=CASDK-NODE

# Make
RUN make clean && make

# Move to a know location
RUN mkdir -p ../latest

# Copy binary
RUN cp out/Release/node ../latest

