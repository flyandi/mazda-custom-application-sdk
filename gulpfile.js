/**
 * Custom Application SDK for Mazda Connect Infotainment System
 *
 * A micro framework that allows to write custom applications for the Mazda Connect Infotainment System
 * that includes an easy to use abstraction layer to the JCI system.
 *
 * Written by Andreas Schwarz (http://github.com/flyandi/mazda-custom-applications-sdk)
 * Copyright (c) 2016. All rights reserved.
 *
 * WARNING: The installation of this application requires modifications to your Mazda Connect system.
 * If you don't feel comfortable performing these changes, please do not attempt to install this. You might
 * be ending up with an unusuable system that requires reset by your Dealer. You were warned!
 *
 * This program is free software: you can redistribute it and/or modify it under the terms of the
 * GNU General Public License as published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even
 * the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
 * License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see http://www.gnu.org/licenses/
 *
 */

/**
 * This is the build file for the Custom Application SDK for the Mazda Infotainment System
 * @build-file
 */


/**
 * @includes
 */
var
    gulp = require('gulp'),
    less = require('gulp-less'),
    concat = require('gulp-concat'),
    rename = require('gulp-rename'),
    uglify = require('gulp-uglify'),
    git = require('gulp-git'),
    //jsdoc = require('gulp-jsdoc'),
    bump = require('gulp-bump'),
    tar = require('gulp-tar'),
    file = require('gulp-file'),
    replace = require('gulp-replace'),
    concatutil = require('gulp-concat-util'),
    runSequence = require('run-sequence'),
    del = require('del'),
    fs = require('fs'),
    glob = require('glob'),
    exec = require('child_process').exec,
    using = require('gulp-using'),
    flatten = require('gulp-flatten');

/**
 * @package
 */

var package = require('./package.json');

/**
 * @configuration
 */

var dist = "./dist/",
    output = "./build/",
    input = "./src/";

/**
 * Builds an json version file
 * @method
 */

var buildJsonVersion = function(output, destination, name, attributes) {

    // get latest package
    var package = require("./package.json");

    // prepare json
    var baseJson = {
        description: 'Custom Application SDK for Infotainment',
        name: name,
        license: 'GPL 3.0',
        author: 'Andy (flyandi) <flyandi@yahoo.com>',
        copyright: '(c) 2016',
        created: (new Date()).toLocaleDateString(),
        url: 'https://github.com/flyandi/mazda-custom-application-sdk/',
        version: package.version,
    };

    // get attributes
    if(attributes) {
        var json = attributes(package);

        // combine
        Object.keys(json).forEach(function(key) {

            baseJson[key] = json[key];
        });
    }

    // write output
    file(output, JSON.stringify(baseJson), {
        src: true
    }).pipe(gulp.dest(destination));
}



/**
 * Tasks to build the AppDrive
 * @jobs
 */

var appDrivePathOutput = output + 'appdrive/',
    systemPathOutput = appDrivePathOutput + 'system/',
    frameworkPathInput = input + 'framework/',
    frameworkPathOutput = systemPathOutput + 'framework/',
    customPathInput = input + 'custom/',
    customPathOutput = systemPathOutput + 'custom/',
    appsPathInput = 'apps/',
    appsPathOutput = appDrivePathOutput + 'apps/';


/**
 * Removes old artifacts from the Appdrive
 * @job appdrive-cleanup
 */
gulp.task('appdrive-cleanup', function() {
    return del(
        [appDrivePathOutput + '**/*']
    );
});

/**
 * Builds the framework skeleton
 * @job apdrive-framework-skeleton
 */
gulp.task('appdrive-framework-skeleton', function() {

    return gulp.src(frameworkPathInput + "skeleton/**/*", {
            base: frameworkPathInput + "skeleton"
        })
        .pipe(gulp.dest(frameworkPathOutput));
});

/**
 * Processes the less files into css
 * @job appdrive-framework-less
 */
gulp.task('appdrive-framework-less', function() {

    return gulp.src(frameworkPathInput + "less/*", {
            base: frameworkPathInput + "less"
        })
        .pipe(concat('framework.css'))
        .pipe(less())
        .pipe(gulp.dest(frameworkPathOutput));
});

/**
 * Compiles the javascript for the framework
 * @job appdrive-framework-js
 */
gulp.task('appdrive-framework-js', function() {

    return gulp.src(frameworkPathInput + "js/*", {
            base: frameworkPathInput + "js"
        })
        .pipe(concat('framework.js'))
        .pipe(uglify())
        .pipe(concatutil.header(fs.readFileSync(frameworkPathInput + "resources/header.txt", "utf8"), {
            pkg: package
        }))
        .pipe(gulp.dest(frameworkPathOutput));
});

/**
 * Copy's the custom application for the JCI system
 * @job appdrive-framework-custom
 */
gulp.task('appdrive-framework-custom', function() {
    return gulp.src(customPathInput + "**/*", {
            base: customPathInput
        })
        .pipe(gulp.dest(customPathOutput));
});

/**
 * Copy's the local apps to the AppDrive
 * @job appdrive-app
 */
gulp.task('appdrive-apps', function() {
    return gulp.src(appsPathInput + "**/*", {
            base: appsPathInput
        })
        .pipe(gulp.dest(appsPathOutput));
});

/**
 * Creates the AppDrive JSON - This is usually managed through the AppDrive app
 * @appdrive-apps-json
 */

gulp.task('appdrive-apps-json', function() {

    buildJsonVersion("appdrive.json", appDrivePathOutput, "appdrive-package", function(package) {
        return {
            framework: true,
        }
    });
});

// (build framework)
gulp.task('build-appdrive', function(callback) {
    runSequence(
        'appdrive-cleanup',
        'appdrive-framework-skeleton',
        'appdrive-framework-less',
        'appdrive-framework-js',
        'appdrive-framework-custom',
        'appdrive-apps',
        'appdrive-apps-json',
        callback
    );
});


/**
 * (build) install deploy image
 *
 * These task builds the install image
 */


var installDeployPathInput = input + 'deploy/install/',
    installDeployPathOutput = output + 'deploy/install/',
    installDeployDataPathOutput = installDeployPathOutput + 'casdk/';

// (cleanup)
gulp.task('install-cleanup', function() {
    return del(
        [installDeployPathOutput + '**/*']
    );
});

// (copy)
gulp.task('install-copy', function() {

    return gulp.src(installDeployPathInput + "**/*", {
            base: installDeployPathInput
        })
        .pipe(gulp.dest(installDeployPathOutput));
});

// (custom)
gulp.task('install-custom', function() {

    return gulp.src(input + "custom/**/*", {
            base: input + "custom"
        })
        .pipe(gulp.dest(installDeployDataPathOutput + "custom/"));
});


// (proxy)
gulp.task('install-proxy', function() {

    return gulp.src(input + "proxy/**/*", {
            base: input + "proxy"
        })
        .pipe(gulp.dest(installDeployDataPathOutput + "proxy/"));
});

/** @job install-version */
gulp.task('install-version', function() {
    buildJsonVersion("system.json", output + 'deploy/', "system-package", function(package) {
        return {
            system: true,
        }
    });
});


// (build)
gulp.task('build-install', function(callback) {
    runSequence(
        'install-cleanup',
        'install-copy',
        'install-proxy',
        'install-version',
        callback
    );
});


/**
 * (build) uninstall deploy image
 *
 * These task builds the uninstall image
 */


var uninstallDeployPathInput = input + 'deploy/uninstall/',
    uninstallDeployPathOutput = output + 'deploy/uninstall/';

// (cleanup)
gulp.task('uninstall-cleanup', function() {
    return del(
        [uninstallDeployPathOutput + '**/*']
    );
});

// (copy)
gulp.task('uninstall-copy', function() {

    return gulp.src(uninstallDeployPathInput + "**/*", {
            base: uninstallDeployPathInput
        })
        .pipe(gulp.dest(uninstallDeployPathOutput));
});


// (build)
gulp.task('build-uninstall', function(callback) {
    runSequence(
        'uninstall-cleanup',
        'uninstall-copy',
        callback
    );
});

/**
 * Build documentation
 */

var docsPathTheme = "./.docstheme/",
    docsPathInput = input + "docs/",
    docsPathOutput = output + "docs/";

// (cleanup)
gulp.task('docs-cleanup', function() {
    return del(
        [docsPathOutput + '**']
    );
});

// (theme)
gulp.task('docs-theme', function(callback) {

    // using jaguarjs theme
    if (!fs.lstatSync(docsPathTheme).isDirectory()) {
        git.clone('https://github.com/davidshimjs/jaguarjs-jsdoc', {
            quiet: true,
            args: docsPathTheme,
        }, callback);
    }

    return callback();
});

// (generate)
gulp.task('docs-generate', function() {

    var
        docInfo = {
            name: 'casdk-' + package.version,
        },
        docOptions = {
            systemName: "Something",
            footer: "Something",
            copyright: "Something",
            navType: "vertical",
            theme: "journal",
            linenums: true,
            collapseSymbols: false,
            inverseNav: false
        },
        docTemplate = {
            path: docsPathTheme,
            cleverLinks: true,
            monospaceLinks: true,
            default: {
                "outputSourceFiles": false
            },
            applicationName: "API Documentation",
            googleAnalytics: "",
            openGraph: {
                "title": "",
                "type": "website",
                "image": "",
                "site_name": "",
                "url": ""
            },
            meta: {
                "title": "CASDK API Documentation " + package.version,
                "description": "",
                "keyword": ""
            },
            linenums: false,
        };

    return gulp.src([input + "runtime/js/*.js", docsPathInput + "markup/*.md"])
        .pipe(jsdoc.parser(docInfo))
        .pipe(jsdoc.generator(docsPathOutput, docTemplate, docOptions))
});

// (build)
gulp.task('build-docs', function(callback) {
    runSequence(
        'docs-cleanup',
        'docs-theme',
        'docs-generate',
        callback
    );
});


/**
 * These build jobs are for distribution
 * @job dist
 * @target dist
 */

/** @job dist-bump-major */
gulp.task('dist-bump-major', function() {
    return gulp.src('./package.json').pipe(bump({
        type: 'major'
    })).pipe(gulp.dest('./'));
});

/** @job dist-bump-minor */
gulp.task('dist-bump-minor', function() {
    return gulp.src('./package.json').pipe(bump({
        type: 'minor'
    })).pipe(gulp.dest('./'));
});

/** @job dist-bump-revision */
gulp.task('dist-bump-revision', function() {
    return gulp.src('./package.json').pipe(bump({
        type: 'revision'
    })).pipe(gulp.dest('./'));
});

/**
 * builds the runtime for distribution
 * @job dist-runtime
 */

var distLatestOutput = dist + "latest/";

var distRuntimeOutput = false;

gulp.task('dist-runtime', function() {

    // get latest package
    var package = require("./package.json");

    distRuntimeOutput = 'runtime-' + package.version + '.package';

    return gulp.src(systemPathOutput + "**/*")
        .pipe(tar(distRuntimeOutput))
        .pipe(gulp.dest(distLatestOutput));
});


/**
 * builds the deployment system for distribution
 * @job dist-system
 */

var distSystemOutput = false;

gulp.task('dist-system', function() {

    // get latest package
    var package = require("./package.json");

    distSystemOutput = 'system-' + package.version + '.package';

    return gulp.src(output + "/deploy/**/*")
        .pipe(tar(distSystemOutput))
        .pipe(gulp.dest(distLatestOutput));
});

/**
 * creates the release information for the distribution
 * @job dist-release
 */
gulp.task('dist-latest', function() {

    buildJsonVersion("latest.json", distLatestOutput, "latest-release-package");
});


/**
 * task to build the runtime, system and release information
 * @job build-dist
 */
gulp.task('build-dist', function(callback) {
    runSequence(
        'dist-runtime',
        'dist-system',
        'dist-latest',
        callback
    );
});

gulp.task('dist-revision', function(callback) {
    runSequence(
        'dist-bump-revision',
        'build-dist',
        callback
    );
});

gulp.task('dist-minor', function(callback) {
    runSequence(
        'dist-bump-minor',
        'build-dist',
        callback
    );
});

gulp.task('dist-major', function(callback) {
    runSequence(
        'dist-bump-major',
        'build-dist',
        callback
    );
});

/**
 * Common Commands
 */

// clean
gulp.task('clean', function() {
    return del(
        [output + '**/*']
    );
});


// Default Task
gulp.task('default', function(callback) {
    runSequence(
        'clean',
        'build-appdrive',
        'build-install',
        'build-uninstall',
        //'build-docs',
        callback
    );
});


/**
 * Node
 */

var nodePathInput = input + 'node-cmu/',
    nodePathSource = input + 'node/latest/',
    nodePathOutput = output + 'node/';


// (cleanup)
gulp.task('node', function() {

    // copy embeeded files
    gulp.src(nodePathInput + "**/*.js", {
        base: nodePathInput
    }).pipe(flatten()).pipe(gulp.dest(nodePathOutput + 'cmu'));


});