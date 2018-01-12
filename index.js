const { writeFile, lstatSync, readdirSync, readFileSync, existsSync } = require('fs');
const { join, dirname, resolve, parse } = require('path');
const mkdirp = require('mkdirp');
const YAML = require('yamljs');

// TODO should make this more robust...
const docRoot = resolve(__dirname, process.argv[2]);
const outFileName = process.argv[3] || 'bundle';

// helper function to create folder if it doesn't exist, then write file
const writeFileToFolder = (path, contents, cb) => {
  mkdirp(dirname(path), (err) => {
    if (err) return cb(err);

    return writeFile(path, contents, cb);
  });
};

const isDirectory =
  source =>
    lstatSync(source).isDirectory();

const getDirectories =
  source =>
    readdirSync(source).map(name => join(source, name));

const rootContents = getDirectories(docRoot);

const compileDirectory = (contents, root) => {
  const orderPath = `${root}/_order.yml`;
  const order = existsSync(orderPath) ? YAML.load(orderPath) : null;

  return contents
    .map(item => parse(item))
    .sort((a, b) => {
      const aOrder = order ? order.findIndex(name => name === a.name) : a.name;
      const bOrder = order ? order.findIndex(name => name === b.name) : b.name;

      if (aOrder < bOrder) return -1;
      if (aOrder > bOrder) return 1;
      return 0;
    })
    .reduce((acc, item) => {
      const { base, name, ext, dir } = item;
      const path = `${dir}/${base}`;

      if (!isDirectory(path)) {
        if (ext !== '.md') return acc;

        // if it's markdown, write contents to the object
        const content = readFileSync(path, 'utf8');

        return [...acc, { name, content }];
      }

      // if directory, recurse through the subdirector
      return [
        ...acc,
        {
          name,
          content: compileDirectory(getDirectories(path), path),
        },
      ];
    }, []);
};

const jsonBundle = JSON.stringify(compileDirectory(rootContents, docRoot));

// write documentation json to the build folder
writeFileToFolder(`./build/${outFileName}.json`, jsonBundle, (err) => {
  if (err) {
    return console.log(err);
  }

  return console.log('The file was saved!');
});
