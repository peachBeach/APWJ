
const gulp = require('gulp');
const through2 = require('through2');

// 基础构建任务
gulp.task('default', function() {
  return gulp.src(['**/*', '!node_modules/**'])
    .pipe(through2.obj(function(file, enc, cb) {
      // 文件处理逻辑
      this.push(file);
      cb();
    }))
    .pipe(gulp.dest('./dist'));
});

// 开发模式监听
gulp.task('watch', function() {
  gulp.watch(['**/*', '!node_modules/**'], gulp.series('default'));
});

module.exports = gulp;
