// Convert the shared page filenames to client route patterns, including URLs
// for records which do not exist yet when the native app is built.
export function pageRoute(file: string) {
  return file.replace(/^\.\.\/app/, '').replace(/\/page\.tsx$/, '')
    .replace(/\[([^\]]+)\]/g, ':$1') || '/';
}
