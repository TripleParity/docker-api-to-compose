import * as Models from './models';

/**
 * Generate a yaml document
 * @param services Array of Services to generate a compose file from
 */
export function compose(services:Models.Service[]):string {
    let ymlString: string = '';

    ymlString = ymlString.concat(JSON.stringify(services));

    return ymlString;
}

export default compose;
