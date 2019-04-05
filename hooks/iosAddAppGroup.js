//
//  iosAddAppGroup.js
//  This hook runs for the iOS platform after plugin is prepared or before it is compiled.
//
// Source: https://stackoverflow.com/questions/22769111/add-entry-to-ios-plist-file-via-cordova-config-xml/31845828#31845828
//

//
// The MIT License (MIT)
//
// Copyright (c) 2017 DavidStrausz
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.
//

const BUNDLE_SUFFIX = '.shareextension';

var fs = require('fs');
var path = require('path');
var plist = require('plist');


// Determine the full path to the app's xcode project file.
function findXCodeproject(context, callback) {
  fs.readdir(iosFolder(context), function(err, data) {
    var projectFolder;
    var projectName;
    // Find the project folder by looking for *.xcodeproj
    if (data && data.length) {
      data.forEach(function(folder) {
        if (folder.match(/\.xcodeproj$/)) {
          projectFolder = path.join(iosFolder(context), folder);
          projectName = path.basename(folder, '.xcodeproj');
        }
      });
    }

    if (!projectFolder || !projectName) {
      throw redError('Could not find an .xcodeproj folder in: ' + iosFolder(context));
    }

    if (err) {
      throw redError(err);
    }

    callback(projectFolder, projectName);
  });
}

// Determine the full path to the ios platform
function iosFolder(context) {
  return context.opts.cordova.project
    ? context.opts.cordova.project.root
    : path.join(context.opts.projectRoot, 'platforms/ios/');
}

function projectPlistPath(context, projectName) {
  return path.join(iosFolder(context), projectName, projectName + '-Info.plist');
}

function projectPlistJson(context, projectName) {
  var path = projectPlistPath(context, projectName);
  return plist.parse(fs.readFileSync(path, 'utf8'));
}

function getAppGroup(context, projectName) {
  var plist = projectPlistJson(context, projectName);
  var group = "group." + plist.CFBundleIdentifier + BUNDLE_SUFFIX;
  return group;
}

module.exports = function (context) {

  var Q = context.requireCordovaModule('q');
  var deferral = new Q.defer();

  findXCodeproject(context, function(projectFolder, projectName) {

    var appGroupName = getAppGroup(context, projectName);
    var entitlementsKey = 'com.apple.security.application-groups';

    // Entitlements-Debug.plist
    var entitlementsDebugFilePath = path.join(iosFolder(context), projectName, 'Entitlements-Debug.plist');
    var entitlementsDebugXml = fs.readFileSync(entitlementsDebugFilePath, 'utf8');
    var entitlementsDebugObj = plist.parse(entitlementsDebugXml);

    entitlementsDebugObj[entitlementsKey] = [appGroupName];

    entitlementsDebugXml = plist.build(entitlementsDebugObj);
    fs.writeFileSync(entitlementsDebugFilePath, entitlementsDebugXml, { encoding: 'utf8' });

    // Entitlements-Release.plist
    var entitlementsReleaseFilePath = path.join(iosFolder(context), projectName, 'Entitlements-Release.plist');
    var entitlementsReleaseXml = fs.readFileSync(entitlementsReleaseFilePath, 'utf8');
    var entitlementsReleaseObj = plist.parse(entitlementsReleaseXml);

    entitlementsReleaseObj[entitlementsKey] = [appGroupName];

    entitlementsReleaseXml = plist.build(entitlementsReleaseObj);
    fs.writeFileSync(entitlementsReleaseFilePath, entitlementsReleaseXml, { encoding: 'utf8' });
    deferral.resolve();
  });

  return deferral.promise;
};
