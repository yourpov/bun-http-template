import { join } from 'path';

import { Glob } from 'bun';

// walks a directory and returns all file paths
export default async (root: string): Promise<string[]> => {
  const glob = new Glob('**/*');
  const filePaths: string[] = [];

  for await (const relativePath of glob.scan({ 'cwd': root, 'onlyFiles': true, 'dot': true }))
    filePaths.push(join(root, relativePath));

  return filePaths;
};
