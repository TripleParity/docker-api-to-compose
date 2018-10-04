import { compose } from '../index';
import { expect } from 'chai';
// https://journal.artfuldev.com/write-tests-for-typescript-projects-with-mocha-and-chai-in-typescript-86e053bdb2b6
// if you used the '@types/mocha' method to install mocha type definitions, uncomment the following line
// import 'mocha';
// Why? Seems to work fine without it

import * as fs from 'fs';

const fileBaseDir = './src/__test__/files';


function testFilePair(fileBaseName: string) {
  const jsonFileContents = fs.readFileSync(fileBaseDir + '/' + fileBaseName + '.json', 'utf-8');
  const ymlFileContents = fs.readFileSync(fileBaseDir + '/' + fileBaseName + '.yml', 'utf-8');

  let services = JSON.parse(jsonFileContents);
  const result = compose(services);
  expect(result).to.equal(ymlFileContents);
}

describe('compose()', () => {
  it('should return the respective yaml document', () => {
    testFilePair('simple_1');
  });
});

