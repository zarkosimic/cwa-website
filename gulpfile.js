'use strict';

const plugins = require('gulp-load-plugins');
const yargs = require('yargs');
const browser = require('browser-sync');
const gulp = require('gulp');
const panini = require('panini');
//const rimraf = require('rimraf');
//const sherpa = require('style-sherpa');
const yaml = require('js-yaml');
const fs = require('fs');
const webpackStream = require('webpack-stream');
const webpack2 = require('webpack');
const named = require('vinyl-named');
const uncss = require('uncss');
const autoprefixer = require('autoprefixer');
const dirTree = require("directory-tree");
// Load all Gulp plugins into one variable
const $ = plugins();

// Check for --develop or --dev flag
let PRODUCTION = !(yargs.argv.develop || yargs.argv.dev);

// Load settings from settings.yml
const { COMPATIBILITY, PORT, UNCSS_OPTIONS, PATHS } = loadConfig();
let filenotes;
// const DOCS_INIT = (yargs.argv.initialize || yargs.argv.init);

function loadConfig(config) {
  let ymlFile = fs.readFileSync(config ? config : 'config.yml', 'utf8');
  return yaml.load(ymlFile);
}

// Build the "dist" folder by running all of the below tasks
// Sass must be run later so UnCSS can search for used classes in the others assets.
gulp.task(
  'build',
  gulp.series(gulp.parallel(pages, javascript, images, copy), sass)
);

// Build the site, run the server, and watch for file changes
gulp.task('default', gulp.series('build', server, watch));

// Delete the "dist" folder
// This happens every time a build starts
// function clean(done) {
//   rimraf(PATHS.dist, done);
// }

// Copy files out of the assets folder
// This task skips over the "img", "js", and "scss" folders, which are parsed separately
function copy() {
  gulp.src(PATHS.rootAssets).pipe(gulp.dest(PATHS.dist));
  return gulp.src(PATHS.assets).pipe(gulp.dest(PATHS.dist + '/assets'));
}

// Copy page templates into finished HTML files
function pages() {
  return gulp
    .src('src/pages/**/*.{html,hbs,handlebars}')
    .pipe(
      panini({
        root: 'src/pages/',
        layouts: 'src/layouts/',
        partials: 'src/partials/',
        data: 'src/data/',
        helpers: 'src/helpers/'
      })
    )
    .pipe(gulp.dest(PATHS.dist));
}

// Load updated HTML templates and partials into Panini
function resetPages(done) {
  panini.refresh();
  done();
}

// Compile Sass into CSS
// In production, the CSS is compressed
function sass() {
  const postCssPlugins = [
    // Autoprefixer
    autoprefixer({ overrideBrowserslist: COMPATIBILITY })

    // UnCSS - Uncomment to remove unused styles in production
    // PRODUCTION && uncss.postcssPlugin(UNCSS_OPTIONS),
  ].filter(Boolean);

  return gulp
    .src('src/assets/scss/style.scss')
    .pipe($.sourcemaps.init())
    .pipe(
      $.sass({
        includePaths: PATHS.sass
      }).on('error', $.sass.logError)
    )
    .pipe($.postcss(postCssPlugins))
    .pipe($.if(PRODUCTION, $.cleanCss({ compatibility: 'ie9' })))
    .pipe($.if(!PRODUCTION, $.sourcemaps.write()))
    .pipe(gulp.dest(PATHS.dist + '/assets/css'))
    .pipe(browser.reload({ stream: true }));
}

let webpackConfig = {
  mode: PRODUCTION ? 'production' : 'development',
  module: {
    rules: [
      {
        test: /\.js$/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
            compact: false
          }
        }
      }
    ]
  },
  devtool: !PRODUCTION && 'source-map'
};

// Combine JavaScript into one file
// In production, the file is minified
function javascript() {
  return gulp
    .src(PATHS.entries)
    .pipe(named())
    .pipe($.sourcemaps.init())
    .pipe(webpackStream(webpackConfig, webpack2))
    .pipe(
      $.if(
        PRODUCTION,
        $.uglify().on('error', e => {
          console.log(e);
        })
      )
    )
    .pipe($.if(!PRODUCTION, $.sourcemaps.write()))
    .pipe(gulp.dest(PATHS.dist + '/assets/js'));
}

// Copy images to the "dist" folder
// In production, the images are compressed
function images() {
  return gulp
    .src('src/assets/img/**/*')
    .pipe(
      $.if(PRODUCTION, $.imagemin([$.imagemin.jpegtran({ progressive: true })]))
    )
    .pipe(gulp.dest(PATHS.dist + '/assets/img'));
}

// Start a server with BrowserSync to preview the site in
function server(done) {
  browser.init(
    {
      server: {
        baseDir: PATHS.dist,
        serveStaticOptions: {
          extensions: ['html']
        }
      },
      port: PORT
    },
    done
  );
}

// Reload the browser with BrowserSync
function reload(done) {
  browser.reload();
  done();
}

// Watch for changes to static assets, pages, Sass, and JavaScript
function watch() {
  gulp.watch(PATHS.assets, copy);
  gulp
    .watch('src/pages/**/*.html')
    .on('all', gulp.series(pages, browser.reload));
  gulp
    .watch('src/{layouts,partials}/**/*.html')
    .on('all', gulp.series(resetPages, pages, browser.reload));
  gulp
    .watch('src/data/**/*.{js,json,yml}')
    .on('all', gulp.series(resetPages, pages, browser.reload));
  gulp
    .watch('src/helpers/**/*.js')
    .on('all', gulp.series(resetPages, pages, browser.reload));
  gulp.watch('src/assets/scss/**/*.scss').on('all', sass);
  gulp
    .watch('src/assets/js/**/*.js')
    .on('all', gulp.series(javascript, browser.reload));
  gulp
    .watch('src/assets/img/**/*')
    .on('all', gulp.series(images, browser.reload));
}

// Pull Documentation Pages (Markdown) and included Images from Remotes defined in docs.json.
gulp.task("docs-remotes",
  gulp.series(getSourceDocs, setSourceDocsImageReferences, getSourceDocsImages)
);

// Generate Dokumentation Pages in pages-folder as html, referencing the md-file. Settings in docs.json.
gulp.task("docs-pages",
  gulp.series(cleanDocsPages, createDocsPages)
);

function getSourceDocsImages(){
  return getSourceDocs();
}

function setSourceDocsImageReferences() {
  const updateBase = function (link) {
    if (!base) {
      base = link.substring(0, link.lastIndexOf("/") + 1);
    } else {
      if (link.indexOf(base) < 0 && base.indexOf("/") > 0) {
        base = base.substring(0, base.length - 1);
        base = base.substring(0, base.lastIndexOf("/") + 1);
        updateBase(link);
      }
      if (base.indexOf("/") < 0) {
        console.log("No common base found: invalid.");
        base = false;
      }
    }
  },
  getImagePath = function (resourceUrl, imageUrl, fwd = false) {
    if (imageUrl.indexOf("http:") == 0 || imageUrl.indexOf("https:") == 0) {
      console.log("external file, returned unchanged.");
    } else {
      resourceUrl = resourceUrl.substring(0, resourceUrl.lastIndexOf("/"));
      imageUrl = imageUrl.replace(/^(\.\/)/, "");
      if (imageUrl.indexOf("../") == 0 && imageUrl.length > 5) {
        return getImagePath(resourceUrl, imageUrl.substring(3, imageUrl.length));
      }
      if (imageUrl.indexOf("/") == 0) {
        console.log("image from server-root detected.");
        resourceUrl = resourceUrl.replace(/^((http:\/\/|https:\/\/)?[^\/]+).*/, "$1");
      }
      imageUrl = resourceUrl + "/" + imageUrl;
    }
    return imageUrl;
  };
  let current, imagePaths = { remotes: [], use: {}, names: {} , dest: PATHS.srcDocs.assets, files: [] }, base = false, currentUse;
  return gulp.src(filenotes.files, { base: "." })
    .pipe($.rename(function (path) {
      current = filenotes.base + filenotes.remotes[filenotes.files.indexOf((path.dirname !== "." ? (path.dirname + "/") : "") + path.basename + path.extname)];
      currentUse = (filenotes.use[current] ? filenotes.use[current] : false);
    }))
    .pipe($.edit(function (src, cb) {
      const _err = null, _links = src.match(/\[.*\]\([^\)]+\)/g);
      if (_links) {
        for (var m in _links) {
          const _imageMDdefinitions = _links[m].match(/\[.+\]\(([^\s]+\.(png|svg|jpg|gif)).*\)/);
          if (_imageMDdefinitions && _imageMDdefinitions.length > 1) {
            const _imgPath = getImagePath(current, _imageMDdefinitions[1]),
              _imgName = _imgPath.substring(_imgPath.lastIndexOf("/") + 1, _imgPath.length);
            imagePaths.remotes.push(_imgPath);
            updateBase(_imgPath);
            if (!imagePaths.use[_imgPath]) {
              imagePaths.use[_imgPath] = [];
            }
            if (imagePaths.names[_imgName]) {
              _imgName = (currentUse ? currentUse : "") + "_" + _imgName;
            }
            imagePaths.names[_imgPath] = {original: _imageMDdefinitions[1], name: _imgName};
            imagePaths.files.push(_imgName);
            imagePaths.use[_imgPath].push({ remote: current, data: currentUse, name: _imgName, original: _imageMDdefinitions[1] });
          }
        }
        for (var n in imagePaths.names) {
          const _rep = "(/" + imagePaths.dest.replace(/^src\/?/,'') + imagePaths.names[n].name,
            _orig = "(" + imagePaths.names[n].original;
          src = src.replace(_orig, _rep); //initial "/" for absolute path
          if(!PRODUCTION){
            console.log(src);
          }
        }
      }
      cb(_err, src);
    })).pipe(gulp.dest("./"))
    .on("end", function () { 
      filenotes.dest = imagePaths.dest;
      filenotes.remotes = imagePaths.remotes;
      filenotes.base = base;
      filenotes.files = imagePaths.files;
      filenotes.names = imagePaths.names;
      filenotes.use = imagePaths.use;
      filenotes.structure = false;
      filenotes.step = function (rurl, lurl, url) {
        const _retobj = { dirname: ".", basename: imagePaths.names[rurl].name};
        _retobj.basename = _retobj.basename.substring(0, _retobj.basename.lastIndexOf("."));
        return _retobj;
      }
    });
}

function getSourceDocs() {
  let remotes = [], base, use = {}, filenames = {}, dest, data, writeDataJSOM, postNamingStep;
  if(!filenotes){
    data = getDocsStructure();
    writeDataJSOM = true;
    dest = PATHS.srcDocs.sources;
    const updateBase = function (link) {
      if (!base) {
        base = link.substring(0, link.lastIndexOf("/") + 1);
      } else {
        if (link.indexOf(base) < 0 && base.indexOf("/") > 0) {
          base = base.substring(0, base.length - 1).substring(0, base.lastIndexOf("/") + 1);
          updateBase(link);
        }
        if (base.indexOf("/") < 0) {
          console.log("No common base found: invalid.");
          base = false;
        }
      }
    },
    getRemoteLinks = function (structure, langs) {
      loopStructureDoc("source", function (val, key, lang, info){
        if (remotes.includes(val)) {
          use[val].push(info.container);
        } else {
          remotes.push(val);
          updateBase(val);
          let _filename = val.substring(val.lastIndexOf("/") + 1, val.length).toLowerCase();
          if (_filename.length > 0) {
            if (filenames[_filename]) {
              if (!filenames[lang + "/" + _filename]) {
                _filename = lang + "/" + _filename;
              } else {
                if (!key) console.log("Error capturing File: " + val);
                _filename = lang + "/" + key + "/" + _filename;
              }
            }
            info.container.tmpFilename = _filename;
          }
          use[val] = [info.container];
        }
      }, false, structure, langs);
    }
    getRemoteLinks(data.structure, data.languages.types);
    filenames = [];
    postNamingStep = function (r_url, l_url, url) {
      use[r_url].forEach(element => {
        element.path = l_url;
        element.tmpFilename = undefined;
      });
    }
  }else{
    dest = filenotes.dest;
    filenames = [];//filenotes.files;
    remotes = filenotes.remotes;
    base = filenotes.base;
    writeDataJSOM = filenotes.write;
    data = filenotes.structure;
    postNamingStep = filenotes.step;
    use = filenotes.use;
  }
  if (base) {
    console.log("creating on base: " + base);
    remotes = remotes.join(", ").replace(new RegExp(base, 'g'), '').split(", ");
    let remoteSrc = function (sources, base, step, end, syncArray, syncObj) {
      if (!end) {
        end = function () { console.log("done with addressing remotes.") }
      }
      if (!syncArray) {
        syncArray = filenames;
      }
      if (!syncObj) {
        syncObj = use;
      }
      return $.remoteSrc(sources, { base: base })
        .pipe($.rename(function (path) {
          const url = (path.dirname != "." ? path.dirname + "/" : "") + path.basename + path.extname,
            remoteurl = base + url;
          let local_url = dest + url;
          if (syncObj && syncObj[remoteurl] && syncObj[remoteurl].length > 0) {
            const _localBasename = syncObj[remoteurl][0].tmpFilename;
            if (_localBasename) {
              local_url = dest;
              if (_localBasename.indexOf("/") > 0) {
                path.dirname = _localBasename.substring(0, _localBasename.lastIndexOf("/"))
                path.basename = _localBasename.substring(_localBasename.lastIndexOf("/") + 1, _localBasename.lastIndexOf("."));
                local_url += path.dirname + "/";
              } else {
                path.dirname = ".";
                path.basename = _localBasename.substring(0, _localBasename.lastIndexOf("."));
              }
              local_url += path.basename + path.extname;
            }
            if (typeof (step) == "function") {
              let _result = step(remoteurl, local_url, url, path);
              if (_result) {
                if (_result.basename) path.basename = _result.basename;
                if (_result.dirname) path.dirname = _result.dirname;
                local_url = dest + (path.dirname != "." ? path.dirname + "/" : "") + path.basename + path.extname;
              }
            }
          }
          syncArray.push(local_url);
        }))
        .pipe(gulp.dest(dest))
        .on("end", end);
    }
    return remoteSrc(remotes, base, postNamingStep, function () {
      if (!PRODUCTION){ 
        console.log("writing files");
        console.log(filenames);
      }
      if (writeDataJSOM){
        writeDocsStructure(data);
      }
      filenotes = { remotes: remotes, base: base, files: filenames, structure: data, use: use };
    }, filenames, use);
  }
}

function writeDocsStructure(data) {
  if (!data && typeof (data) !== 'object') { console.log("invalid data, " + PATHS.srcDocs.structure.file + " not written."); return false; }
  console.log("writing " + PATHS.srcDocs.structure.folder + PATHS.srcDocs.structure.file);
  fs.writeFileSync(
    PATHS.srcDocs.structure.folder + PATHS.srcDocs.structure.file,
    JSON.stringify(data, null, "\t")
  );
  return true;
}

function getDocsStructure() {
  return JSON.parse(
    fs.readFileSync(
      PATHS.srcDocs.structure.folder + PATHS.srcDocs.structure.file,
      "utf8"
    )
  );
}

function getPagePropertiesHeader(pageInfo, propertiesDef) {
  let props = "---\nlayout: docs\n";

  props += '---\n';
  return props;
}

function loopStructureDoc(attribute, reply, lang, structure, languages, nesting, namepath=""){
  if (!structure && filenotes && filenotes.data && filenotes.data.structure){
    structure = filenotes.data;
  }
  const _languages = languages ? languages : structure.languages.types,
    _structure = structure.structure ? structure.structure : structure;
  for (var k in _structure) {
    if (typeof (_structure[k]) === "string" && k === attribute) {
      reply(_structure[k], (nesting ? nesting.substring(nesting.lastIndexOf(".")+1, nesting.length) : false), lang, {languages: languages, path: nesting, container: _structure, namepath: namepath});
    } else {
      if (typeof (_structure[k]) === "object") {
        loopStructureDoc(attribute, reply, (lang ? lang : (_languages.includes(k) ? k : false)), _structure[k], _languages, (nesting ? (nesting + "." + k) : k), _structure[k].name ? namepath + (_structure[k].name + "/") : namepath);
      }
    }
  }
}

function getNestedObject (obj, path) {
  var current = obj;
  try {
    path.split('.').forEach(function (p) { current = current[p]; });
  } catch (e) { return false; }
  return current;
};

function cleanDocsPages(){
  const languages = getDocsStructure().languages.types;
  let folders = [];
  languages.forEach(language => {
    folders.push(PATHS.srcDocs.pages + "/" + language + "/docs")
  });
  return gulp.src(folders, { read: false, allowEmpty: true })
    .pipe($.clean());
}

async function createDocsPages() {
  const config = getDocsStructure(), structure = config.structure;
  if (typeof (structure) === "object") {
    console.log('building page structure for docs');
    let destinations = {}, contents = {};
    const dest = PATHS.srcDocs.pages,
      keyFolder = "docs",
      langs = config.languages,
      pageDefaults = config.pages;
      
    loopStructureDoc('path', function(val, key, lang, info){
      let _notes = {title: info.container.title, name: info.container.name, path: val, description: info.container.description};
      _notes.key = info.path.indexOf(lang) == 0 ? info.path.replace(lang + ".", "") : info.path;
      _notes.url = lang + "/" + keyFolder + "/" + (key !== config.index ? info.namepath : "");
      _notes.language = lang;
      if(!_notes.description && config.description && config.description[lang]){
        _notes.description = config.description[lang];
      }
      destinations[dest + "/" + _notes.url + "index.html"] = _notes;
      contents[info.path] = _notes;
    }, false, config);

    for(let file in destinations){
      const details = destinations[file];
      let filecontent = "---\nlayout: docs\n",
        getOtherLanguageValue = function (val, call) {
          const obj = {};
          langs.types.forEach((language) => {
            if (language != details.language) {
              if (val) {
                obj[language] = contents[language + "." + details.key][val];
              }
              call(language, val ? obj[language] : false);
            }
          });
          return obj;
        },
        getMatched = function (str) {
          const match = str.match(/\[?#\{[^\}]+\}\]?/g);
          if (match) {
            let _strs = [],
              _str = str;
            match.forEach((item) => {
              if (item.indexOf("#{language.types") >= 0) {
                if (item.indexOf(":") > item.indexOf("#{language.types")) {
                  getOtherLanguageValue(
                    item.replace(/#\{language\.types:#([^\}]+)\}/, "$1"),
                    function (lang, langContent) {
                      _strs.push(str.replace(item, langContent));
                    }
                  );
                } else {
                  getOtherLanguageValue(false, function (a) {
                    _strs.push(_str.replace(item, a));
                  });
                }
              } else {
                let strValue = details[item.replace(/#\{([^\}]+)\}/, "$1")];
                if (_strs.length > 0) {
                  for (let i = 0; i < _strs.length; i++) {
                    _strs[i] = _strs[i].replace(item, strValue);
                  }
                } else {
                  _str = _str.replace(item, strValue);
                }
              }
            });
            if (_strs.length > 0) {
              return _strs;
            } else {
              return _str;
            }
          }
          return str;
        };
      for (let p in pageDefaults.properties) {
        let prop = getMatched(p), 
          val = getMatched(pageDefaults.properties[p]);
        if(prop instanceof Array && prop.length > 1 && val instanceof Array && val.length == prop.length){
          for(let m=0; m<val.length; m++){
            filecontent += prop[m] + ": " + val[m] + "\n";
          }
        }else{
          filecontent += prop + ": " + val + "\n";
        }
      }
      filecontent +="---\n{{{md '" + details.path + "'}}}\n\n";
      console.log("creating file: " + file);
      let targetDir = file.substr(0, file.lastIndexOf("/"));
      if (!fs.existsSync(targetDir)){
        fs.mkdirSync(targetDir, { recursive: true });
      }
      fs.writeFileSync(
        file,
        filecontent,
        (err) => {
          if (err) throw err;
        }
      );
    }
  }
}
