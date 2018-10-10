import 'source-map-support/register';

import * as yaml from 'js-yaml';
import * as ComposeModels from './composeModels';
import * as DockerModels from './dockerModels';

export interface NetworkMap {
    [id: string]: DockerModels.Network;
}

export interface VolumeMap {
    [name: string]: DockerModels.Volume;
}

/**
 * Get the service name as at stack creation time
 * @param service
 */
function getServiceName(service: DockerModels.Service): string {
    if (service.Spec.Labels) {
        for (const label in service.Spec.Labels) {
            if (label === 'com.docker.stack.namespace') {
                return service.Spec.Name.replace(service.Spec.Labels[label] + '_', '');
            }
        }
    }

    return service.Spec.Name;
}

/**
 * Remove Docker-internal labels added by Docker CLI
 * @param labels
 */
function stripDockerLabels(labels: {[name: string]: string} | undefined): {[name: string]: string} {
    const result: {[name: string]: string} = {};

    if (labels) {
        for (const key in labels) {
            if (!(key === 'com.docker.stack.image') && !(key === 'com.docker.stack.namespace')) {
                result[key] = labels[key];
            }
        }
    }

    return result;
}

function parseMounts(service: DockerModels.Service): ComposeModels.Mount[] {
    const mounts: ComposeModels.Mount[] = [];

    if (service.Spec.TaskTemplate.ContainerSpec.Mounts) {
        const dockerMounts: DockerModels.Mount[] = service.Spec.TaskTemplate.ContainerSpec.Mounts;

        for (const dockerMount of dockerMounts) {
            let stackPrefix = '';

            if (dockerMount.VolumeOptions && dockerMount.VolumeOptions.Labels) {
                if (dockerMount.VolumeOptions.Labels['com.docker.stack.namespace']) {
                    stackPrefix = dockerMount.VolumeOptions.Labels['com.docker.stack.namespace'] + '_';
                }
            }

            mounts.push({
                type: dockerMount.Type,
                source: dockerMount.Source.replace(stackPrefix, ''),
                target: dockerMount.Target,
            });
        }
    }

    return mounts;
}

function getNetworkName(network: DockerModels.Network): string {
    if (network.Labels) {
        for (const label in network.Labels) {
            if (label === 'com.docker.stack.namespace') {
                return network.Name.replace(network.Labels[label] + '_', '');
            }
        }
    }

    // Network was not created as part of a stack
    return network.Name;
}

/**
 * Returns the networks from the NetworkMap according to the given service
 * @param {DockerModels.Service} service
 * @param {NetworkMap} networkMap
 * @returns {string[]}
 */
function parseNetworks(service: DockerModels.Service, networkMap: NetworkMap): DockerModels.Network[] {
    const result: DockerModels.Network[] = [];

    const networks = service.Spec.TaskTemplate.Networks;

    if (networks) {
        for (const network of networks) {
            if (network.Target) {
                if (networkMap[network.Target]) {
                    result.push(networkMap[network.Target]);
                } else {
                    throw new Error('Network ID not found in NetworkMap: ' + network.Target);
                }
            }
        }
    }

    return result;
}

/**
 * Create intermediate structure to help with Stack networks
 *
 * @param {NetworkMap} networkMap
 * @returns {{[name: string]: ComposeModels.StackNetwork}}
 */
function createStackNetworkMap(networkMap: NetworkMap): {[name: string]: ComposeModels.StackNetwork} {
    const result: {[name: string]: ComposeModels.StackNetwork} = {};

    for (const networkId in networkMap) {
        const dockerNetwork = networkMap[networkId];
        if (!dockerNetwork) {
            throw new Error('undefined network in NetworkMap');
        }

        if (!dockerNetwork.Driver) {
            throw new Error('Network in NetworkMap does not have a driver: ' + networkId);
        }

        result[getNetworkName(networkMap[networkId])] = {
            driver: dockerNetwork.Driver,
        };

        if (dockerNetwork.Labels && !(dockerNetwork.Labels["com.docker.stack.namespace"])) {
            result[getNetworkName(networkMap[networkId])].external = true;
        }
    }

    return result;
}

function parsePorts(service: DockerModels.Service): ComposeModels.Port[] {
    const result: ComposeModels.Port[] = [];

    // NOTE: assumes the attributes will be defined
    if (service.Spec.EndpointSpec && service.Spec.EndpointSpec.Ports) {
        for (const port of service.Spec.EndpointSpec.Ports) {
            result.push({
                published: port.PublishedPort,
                target: port.TargetPort,
                protocol: port.Protocol,
                mode: port.PublishMode,
            });
        }
    }

    return result;
}

function getConfigNames(service: DockerModels.Service): string[] {
    const result: string[] = [];

    if (service.Spec.TaskTemplate.ContainerSpec.Configs) {
        for (const config of service.Spec.TaskTemplate.ContainerSpec.Configs) {
            // NOTE: Assumes ConfigName will be defined
            // TODO: Remove stack prefix
            result.push(config.ConfigName);
        }
    }
    return result;
}

function parseService(service: DockerModels.Service, networkMap: NetworkMap): ComposeModels.Service {

    // Image name
    const result: ComposeModels.Service = {
        image: service.Spec.TaskTemplate.ContainerSpec.Image.split('@')[0],
    };

    // Ports
    const ports: ComposeModels.Port[] = parsePorts(service);
    if (ports.length !== 0) {
        result.ports = ports;
    }

    // Networks
    const networks: DockerModels.Network[] = parseNetworks(service, networkMap);
    if (networks.length !== 0) {
        for (const net of networks) {
            result.networks = [];
            result.networks.push(getNetworkName(net));
        }
    }

    // Configs
    // TODO:
    const deployBlob: any = {};

    // Mode
    if (service.Spec.Mode && service.Spec.Mode.Replicated) {
        deployBlob.mode = "replicated";
        deployBlob.replicas = service.Spec.Mode.Replicated.Replicas;
    }

    if (service.Spec.Mode && service.Spec.Mode.Global) {
        deployBlob.mode = "global";
    }

    // Mounts
    const mounts: ComposeModels.Mount[] = parseMounts(service);
    if (mounts.length !== 0) {
        result.volumes = mounts;
    }

    // Labels
    const labelsService: {[name: string]: string} = stripDockerLabels(service.Spec.Labels);
    const labelsContainer: {[name: string]: string} = stripDockerLabels(service.Spec.TaskTemplate.ContainerSpec.Labels);

    // Constraints
    let constraints: string[] = [];
    if (service.Spec.TaskTemplate.Placement && service.Spec.TaskTemplate.Placement.Constraints) {
        constraints = service.Spec.TaskTemplate.Placement.Constraints;
    }

    // Labels attached to service

    if (Object.keys(labelsService).length !== 0 ) {
        deployBlob.labels = labelsService;
    }

    // Labels attached to container
    if (Object.keys(labelsContainer).length !== 0 ) {
        result.labels = labelsContainer;
    }

    if (constraints.length !== 0) {
        deployBlob.placement = {constraints};
    }

    // Attach deploy section if required
    if (Object.keys(labelsService).length + constraints.length > 0 || Object.keys(deployBlob).length > 0) {
        result.deploy = deployBlob;
    }

    if (service.Spec.TaskTemplate.ContainerSpec.Env) {
        result.environment = service.Spec.TaskTemplate.ContainerSpec.Env;
    }

    return result;
}

/**
 * Generate a docker-compose string from a list of JSON service documents
 *
 * @param services Array of Services to generate a compose file from
 * @param networks Map of network ID -> network name
 */
export function compose(services: DockerModels.Service[], networkMap: NetworkMap, volumeMap: VolumeMap): string {

    const stackNetworkMap = createStackNetworkMap(networkMap);

    const servicesBlob: {[name: string]: ComposeModels.Service} = {};

    for (const dockerService of services) {
        const composeService = parseService(dockerService, networkMap);
        servicesBlob[getServiceName(dockerService)] = composeService;
    }

    // TODO(egeldenhuys): Move networks and volumes to own function?
    const networksBlob: {[name: string]: ComposeModels.StackNetwork} = {};
    const volumesBlob: {[name: string]: ComposeModels.StackVolume} = {};

    for (const serviceName in servicesBlob) {
        const composeService = servicesBlob[serviceName];

        if (composeService.networks) {
            for (const networkName of composeService.networks) {

                if (!stackNetworkMap[networkName]) {
                    throw new Error('undefined network in StackNetworkMap: ' + networkName);
                }

                networksBlob[networkName] = stackNetworkMap[networkName];
            }
        }

        if (composeService.volumes) {
            for (const mount of composeService.volumes) {
                if (mount.type === "volume") {

                    if (!volumeMap[mount.source]) {
                        throw new Error('undefined volume in VolumeMap. Volume name: ' + mount.source);
                    }

                    if (volumeMap[mount.source].Labels &&
                        !(volumeMap[mount.source].Labels['com.docker.stack.namespace'])) {
                        volumesBlob[mount.source] = {
                            external: true,
                        };
                    } else {
                        volumesBlob[mount.source] = {
                            driver: volumeMap[mount.source].Driver,
                        };
                    }
                }
            }
        }

    }

    const stackFile: ComposeModels.StackFile = {
        version: '3.3',
        services: servicesBlob,
    };

    if (Object.keys(networksBlob).length !== 0) {
        stackFile.networks = networksBlob;
    }

    if (Object.keys(volumesBlob).length !== 0) {
        stackFile.volumes = volumesBlob;
    }

    return yaml.safeDump(stackFile);
}

/**
 * Creates a map of volume name => volume and normalizes the volume name
 * @param volumes
 */
export function createVolumeMap(volumes: DockerModels.Volume[]): VolumeMap {
    const result: {[name: string]: DockerModels.Volume} = {};

    for (const vol of volumes) {
        if (vol.Labels && vol.Labels["com.docker.stack.namespace"]) {
            vol.Name = vol.Name.replace(vol.Labels["com.docker.stack.namespace"] + "_", "");
        }

        result[vol.Name] = vol;
    }

    return result;
}

/**
 * Create a network map to allow generating a docker-compose file
 * @param networks Array of Network objects from Docker
 */
export function createNetworkMap(networks: DockerModels.Network[]): NetworkMap {
    const result: {[id: string]: DockerModels.Network} = {};

    for (const net of networks) {
        result[net.Id] = net;
    }

    return result;
}

/**
 * Return a list of network IDs that require inspection
 *
 * This is required to create a NetworkMap
 * @param services
 */
export function getNetworkIds(services: DockerModels.Service[]): string[] {
    const result: string[] = [];

    for (const service of services) {
        if (service.Spec.TaskTemplate.Networks) {
            for (const net of service.Spec.TaskTemplate.Networks) {
                result.push(net.Target);
            }
        }
    }

    return result;
}

export default compose;
