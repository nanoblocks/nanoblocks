/*global module*/
module.exports = function (grunt) {
    'use strict';

    // mocha task
    var gruntConfig = {};
    grunt.loadNpmTasks('grunt-mocha');
    gruntConfig.mocha = {
        options: {
            bail: true,
            log: true
        },
        index: [ 'test/index.html' ]
    };


    // jshint tast: not ready for this

    // grunt.loadNpmTasks('grunt-contrib-jshint');
    // gruntConfig.jshint = {
    //     options: {
    //         jshintrc: '.jshintrc'
    //     },
    //     files: [
    //         'src/*.js'
    //     ]
    // };

    grunt.initConfig(gruntConfig);
    grunt.registerTask('default', [ 'mocha' ]);
};
