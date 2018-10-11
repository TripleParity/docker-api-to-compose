import { expect } from 'chai';
import * as DockerModels from '../lib/dockerModels';
import { compose, getNetworkIds, getVolumeNames } from '../lib/index';

// https://journal.artfuldev.com/write-tests-for-typescript-projects-with-mocha-and-chai-in-typescript-86e053bdb2b6
// if you used the '@types/mocha' method to install mocha type definitions, uncomment the following line
// import 'mocha';
// Why? Seems to work fine without it

import * as fs from 'fs';

const fileBaseDir = './test/expected_io';

function getExpectedVolumeNames(expectedVolumes: DockerModels.Volume[]): string[] {
  const result: string[] = [];

  for (const vol of expectedVolumes) {
    result.push(vol.Name);
  }

  return result;
}

function getExpectedNetworkIds(expectedNetworks: DockerModels.Network[]): string[] {
  const result: string[] = [];

  for (const net of expectedNetworks) {
   result.push(net.Id);
  }

  return result;
}

// function testGetNetworkIds(services: DockerModels.Service[], networks: DockerModels.Network[]) {
//   const actualNetworks = getNetworkIds(services);
//   const expectedNetworks: string[] = [];

//   for (const dockerService of services) {
//     if (dockerService.Spec.TaskTemplate.Networks) {
//       for (const net of dockerService.Spec.TaskTemplate.Networks) {
//         expectedNetworks.push(net.Target);
//       }
//     }
//   }

//   expect(actualNetworks).to.have.members(expectedNetworks);
// }

function testFilePair(fileBaseName: string) {
  const jsonFileContents = fs.readFileSync(fileBaseDir + '/' + fileBaseName + '.json', 'utf-8');
  const ymlFileContents = fs.readFileSync(fileBaseDir + '/' + fileBaseName + '.yml', 'utf-8');

  let netFileContents = '[]\n';

  if (fs.existsSync(fileBaseDir + '/' + fileBaseName + '_net.json')) {
    netFileContents = fs.readFileSync(fileBaseDir + '/' + fileBaseName + '_net.json', 'utf-8');
}

  let volFileContents = '[]\n';

  if (fs.existsSync(fileBaseDir + '/' + fileBaseName + '_vol.json')) {
    volFileContents = fs.readFileSync(fileBaseDir + '/' + fileBaseName + '_vol.json', 'utf-8');
  }

  const services: DockerModels.Service[] = JSON.parse(jsonFileContents);
  const networks: DockerModels.Network[] = JSON.parse(netFileContents);
  const volumes: DockerModels.Volume[] = JSON.parse(volFileContents);

  const expectedNetworkIds = getExpectedNetworkIds(networks);
  const networkIds = getNetworkIds(services);
  expect(networkIds).to.have.members(expectedNetworkIds);

  const expectedVolumeNames = getExpectedVolumeNames(volumes);
  const volumeNames = getVolumeNames(services);
  expect(volumeNames).to.have.members(expectedVolumeNames);

  const result = compose(services, networks, volumes);
  expect(result).to.equal(ymlFileContents);
}

// TODO(egeldenhuys): Test errors

describe('compose()', () => {
  it('should return the service name without stack prefix and image name with tag', () => {
    testFilePair('service_name_1');
    testFilePair('service_name_2');
  });

  it('should return labels set using the labels/ key', () => {
    testFilePair('labels_1');
  });

  it('should return labels set using the /deploy/labels key', () => {
    testFilePair('labels_2');
  });

  it('should return overlay networks', () => {
    testFilePair('networks_1');
  });

  it('should return external networks', () => {
    testFilePair('networks_2');
  });

  it('should return environment variables', () => {
    testFilePair('environment_1');
  });

  it('should return constraints', () => {
    testFilePair('constraints_1');
  });

  it('should return bind mounts', () => {
    testFilePair('volumes_1');
  });

  it('should return volumes', () => {
    testFilePair('volumes_2');
  });

  it('should return external volumes', () => {
    testFilePair('volumes_3');
  });

  it('should return ports given in long format', () => {
    testFilePair('ports_1');
  });

  it('should return replicated mode and replicas', () => {
    testFilePair('mode_1');
  });

  // TODO:
  // it('should return configs created in the stack file', () => {
  //   testFilePair('config_1');
  // });

});
