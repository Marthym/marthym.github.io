require('es6-promise').polyfill();

/* ****************************************************************************************************
*  Variables                                                                                          *
**************************************************************************************************** */

var confGlobal = require('./src/config/gulp-global.json');
var confPlugins = require('./src/config/gulp-plugins.json');

var gulp = require('gulp');
var plugins = require("gulp-load-plugins")({
  pattern: ['gulp-*', 'gulp.*'],
  replaceString: /\bgulp[\-.]/
});
var uncss = require('postcss-uncss');
var gulpif = require('gulp-if');
var del = require('del');
var pngquant = require('imagemin-pngquant');


/* ****************************************************************************************************
*                                                                                                     *
*  SUBTASKS                                                                                           *
*                                                                                                     *
**************************************************************************************************** */

gulp.task('js', function(){
	
    var sourcemaps = require('gulp-sourcemaps');

    return gulp.src('./src/**/*.js')
      .pipe(plugins.plumber({ handleError: function(err) { console.log(err); this.emit('end'); } }))
      .pipe(sourcemaps.init())
      .pipe(gulpif(!confGlobal.isDevelop, plugins.uglify({ mangle: true })))
      .pipe(gulpif(!confGlobal.isDevelop, plugins.stripDebug()))
      .pipe(gulpif(confGlobal.enableGZIP, plugins.gzip(confPlugins.gzipOptions)))
      .pipe(sourcemaps.write('./', { includeContent: false }))
      .pipe(gulp.dest('./static/'));
});

gulp.task('css', function(){	
    var autoprefixer = require('autoprefixer');
    var pseudoelements = require('postcss-pseudoelements');
	var cssnano = require('cssnano');
	
    var processors = [
      autoprefixer(confPlugins.autoprefixer),
      pseudoelements
    ];
	
	if (!confGlobal.isDevelop) {
		processors = [
		  autoprefixer(confPlugins.autoprefixer),
		  pseudoelements,
		  cssnano
		 ];
	 }
	
	return gulp.src('./src/scss/main.scss')
      .pipe(plugins.plumber({ handleError: function(err) { console.log(err); this.emit('end'); } }))
      .pipe(plugins.sass())
      .pipe(plugins.postcss(processors))
      .pipe(gulpif(confGlobal.enableGZIP, plugins.gzip(confPlugins.gzipOptions)))
      .pipe(gulp.dest('./static/css/'));
});

gulp.task('css:clean', function(){
	return gulp.src('./public/css/styles.css')
      .pipe(gulpif(!confGlobal.isDevelop, plugins.postcss(uncss({ html: './public/**/*.html' }))))
      .pipe(gulp.dest('./static/css/'));
});

gulp.task('watch', function(){
	gulp.watch('./src/scss/**/*.scss', gulp.series('css'));
    gulp.watch('./src/js/**/*.js', gulp.series('js'));
});


/* ****************************************************************************************************
*                                                                                                     *
*  HELPERS                                                                                            *
*                                                                                                     *
**************************************************************************************************** */

gulp.task('copy:assets', function(){
	return gulp.src(['./src/**/*.*','!./src/js/*.*','!./src/scss/*.*'])
      .pipe(gulp.dest('./static/'));
});

gulp.task('copy:assets:minify', function(){
	return gulp.src(['./src/**/*.*','!./src/scss/**/*.*', '!./src/config/*.*'])
      .pipe(gulpif(!confGlobal.isDevelop, plugins.imagemin({
        progressive: true,
        svgoPlugins: [{
          removeViewBox: false
        }],
        use: [pngquant()]
      }))) // Minify only on prod
      .pipe(gulp.dest('./static/'));
});

gulp.task('clean', function(){
	console.log('Deleting public folder...');
    return del('./public/');
});
	
gulp.task('hugo:server', plugins.shell.task([
    'hugo server'
]));
	
gulp.task('hugo:server:nowatch', plugins.shell.task([
    'hugo server -w=false'
]));
	
gulp.task('hugo:build', plugins.shell.task([
    'hugo'
]));

gulp.task('dev', 
    gulp.series(async () => confGlobal.isDevelop = true, gulp.parallel('js','css'), 'watch'));

gulp.task('dev:nowatch', 
    gulp.series(async () => confGlobal.isDevelop = true, gulp.parallel('js','css')));

gulp.task('prod', 
    gulp.series(async () => confGlobal.isDevelop = false, 'clean', gulp.parallel('js','css'), 'copy:assets:minify'));

/* ****************************************************************************************************
*                                                                                                     *
*  MAIN TASKS                                                                                         *
*                                                                                                     *
**************************************************************************************************** */

gulp.task('default', gulp.series('dev'));
