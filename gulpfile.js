"use strict";

var gulp = require("gulp"),
  watch = require("gulp-watch"),
  prefixer = require("gulp-autoprefixer"),
  uglify = require("gulp-uglify"),
  sass = require("gulp-sass"),
  sourcemaps = require("gulp-sourcemaps"),
  cssmin = require("gulp-minify-css"),
  browserSync = require("browser-sync"),
  babel = require("gulp-babel"),
  rigger = require("gulp-rigger"),
  sassGlob = require("gulp-sass-glob"),
  util = require("gulp-util"),
  lazypipe = require("lazypipe"),
  rename = require("gulp-rename"),
  embedlr = require("gulp-embedlr"),
  plumber = require("gulp-plumber"),
  gulpif = require("gulp-if"),
  zip = require("gulp-zip"),
  reload = browserSync.reload;

var onError = function(err) {
  util.log(util.colors.red("Error"), err.message);
  this.emit("end");
};

function endsWith(str, suffix) {
  return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

var path = {
  build: {
    //Тут мы укажем куда складывать готовые после сборки файлы
    templates: "content/themes/dev/",
    js: "content/themes/dev/assets/js",
    css: "content/themes/dev/assets/css",
    fonts: "content/themes/dev/assets/fonts",
    stuff: "content/themes/dev/"
  },
  src: {
    //Пути откуда брать исходники
    templates: "templates/**/*.hbs",
    js: "js/*.js",
    style: "css/*.scss",
    fonts: "fonts/*.*",
    stuff: "stuff/*"
  },
  watch: {
    //Тут мы укажем, за изменением каких файлов мы хотим наблюдать
    templates: "templates/**/*.hbs",
    js: "js/*.js",
    style: "css/**/*.scss",
    fonts: "onts/*.*",
    stuff: "stuff/*"
  },
  dist: "content/themes/dev/**/*"
};

// copy handlebars theme files over
gulp.task("templates:dev", function() {
  var embed_live_reload = lazypipe()
    .pipe(rename, function(path) {
      path.extname = ".html";
    })
    .pipe(embedlr)
    .pipe(rename, function(path) {
      path.extname = ".hbs";
    });

  gulp
    .src(path.src.templates)
    .pipe(plumber(onError))
    .pipe(
      gulpif(function(file) {
        return endsWith(file.path, "default.hbs");
      }, embed_live_reload())
    )
    .pipe(gulp.dest(path.build.templates))
    .pipe(reload({ stream: true }));
});

gulp.task("templates:build", function() {
  gulp.src(path.src.templates).pipe(gulp.dest(path.build.templates));
});

// JS
gulp.task("js:build", function() {
  gulp
    .src(path.src.js) //Найдем наш main файл
    .pipe(plumber(onError))
    .pipe(rigger()) //Прогоним через rigger
    .pipe(babel({ presets: ["@babel/env"] }))
    .pipe(sourcemaps.init()) //Инициализируем sourcemap
    .pipe(uglify()) //Сожмем наш js
    .pipe(sourcemaps.write()) //Пропишем карты
    .pipe(gulp.dest(path.build.js)) //Выплюнем готовый файл в build
    .pipe(reload({ stream: true })); //И перезагрузим сервер
});

// STYLE
gulp.task("style:build", function() {
  gulp
    .src(path.src.style) //Выберем наш main.scss
    .pipe(sourcemaps.init()) //То же самое что и с js
    .pipe(sassGlob())
    .pipe(sass()) //Скомпилируем
    .pipe(prefixer()) //Добавим вендорные префиксы
    .pipe(cssmin()) //Сожмем
    .pipe(sourcemaps.write())
    .pipe(gulp.dest(path.build.css)) //И в build
    .pipe(reload({ stream: true })); //И перезагрузим сервер
});

// STUFF
gulp.task("stuff:build", function() {
  gulp.src(path.src.stuff).pipe(gulp.dest(path.build.stuff));
});

// FONTS
gulp.task("fonts:build", function() {
  gulp.src(path.src.fonts).pipe(gulp.dest(path.build.fonts));
});

// GULP WATCH
gulp.task("watch", function() {
  // наблюдаем за файлами
  watch([path.watch.templates], function(event, cb) {
    gulp.start("templates:dev");
  });
  watch([path.watch.style], function(event, cb) {
    gulp.start("style:build");
  });
  watch([path.watch.js], function(event, cb) {
    gulp.start("js:build");
  });
  watch([path.watch.stuff], function(event, cb) {
    gulp.start("stuff:build");
  });
  watch([path.watch.fonts], function(event, cb) {
    gulp.start("fonts:build");
  });

  // запускаем ghost server
  var ghost = require("ghost");
  process.env.NODE_ENV = "development";
  ghost().then(function(ghostServer) {
    ghostServer.start();
  });

  // reload broser
  browserSync({
    proxy: "localhost:2369"
  });
});

// BUILD
gulp.task("build", [
  "templates:build",
  "js:build",
  "style:build",
  "fonts:build",
  "stuff:build"
]);

// DIST
gulp.task("dist", ["build"], function() {
  gulp
    .src(path.dist)
    .pipe(zip("dev-theme.zip"))
    .pipe(gulp.dest("."));
});

// DEFAULT
gulp.task("default", ["build", "watch"]);
