# docker-api-to-compose

[![codecov](https://codecov.io/gh/TripleParity/docker-api-to-compose/branch/master/graph/badge.svg)](https://codecov.io/gh/TripleParity/docker-api-to-compose)
[![Build Status](https://travis-ci.org/TripleParity/docker-api-to-compose.svg?branch=master)](https://travis-ci.org/TripleParity/docker-api-to-compose)
[![Maintainability](https://api.codeclimate.com/v1/badges/9c9312b9792b49b1ec8a/maintainability)](https://codeclimate.com/github/TripleParity/docker-api-to-compose/maintainability)
[![Test Coverage](https://api.codeclimate.com/v1/badges/9c9312b9792b49b1ec8a/test_coverage)](https://codeclimate.com/github/TripleParity/docker-api-to-compose/test_coverage)

Generate docker-compose files from Docker API inspect output.

## Features
- Accepts JSON data from docker API v1.37
- Generates v3.3 docker-compose.yml files

## Docker Compose Features
Crossed out features are not compatible with Docker Swarm.

- [ ] ~~build~~
- [ ] ~~cap_add, cap_drop~~
- [ ] command
- [ ] configs  (**priority**)
    - [ ] Short syntax
    - [ ] Long syntax
- [ ] ~~cgroup_parent~~
- [ ] ~~container_name~~
- [ ] credential_spec (3.3+)
- [ ] deploy (3 only)
    - [ ] endpoint_mode (3.3 only)
    - [x] labels
    - [x] mode
    - [ ] placement
        - [x] constraints
        - [ ] preferences
    - [x] replicas
    - [ ] resources (**priority**)
    - [ ] restart_policy
    - [ ] rollback_config (3.7+)
    - [ ] update_config 
- [ ] ~~devices~~
- [ ] ~~depends_on~~
- [ ] dns
- [ ] dns_search
- [ ] tmpfs (3.6+)
- [ ] entrypoint
- [ ] env_file
- [x] environment
- [ ] expose (**priority**)
- [ ] ~~external_links~~
- [ ] extra_hosts
- [ ] healthcheck
- [x] image
- [ ] init (3.7+)
- [ ] isolation
- [x] labels
- [ ] ~~links~~
- [ ] logging (**priority**)
- [ ] ~~network mode~~
- [x] networks
    - [ ] aliases
    - [ ] ~~ipv4_address, ipv6_address~~
- [ ] pid
- [x] ports
    - [x] Short syntax
    - [x] Long syntax (3.2+)
- [ ] secrets (**priority**)
    - [ ] Short syntax
    - [ ] Long syntax
- [ ] ~~security_opt~~
- [ ] stop_grace_period
- [ ] ~~stop_signal~~
- [ ] ~~sysctls~~
- [ ] ulimits
- [ ] ~~userns_mode~~
- [x] volumes
    - [x] Short syntax
        - [ ] access mode
    - [x] Long syntax (3.2+)
        - [x] type
        - [x] source
        - [x] target
        - [ ] read_only
        - [ ] bind
            - [ ] propagation
        - [ ] volume
            - [ ] nocopy
        - [ ] tmpfs
            - [ ] size
    - [ ] Caching options for volume mounts (Docker for Mac)
- [ ] domainname, hostname, ipc, mac_address, privileged, read_only, shm_size, stdin_open, tty, user, working_dir
- [ ] Volume configuration reference
    - [x] driver
    - [ ] driver_opts
    - [x] external (deprecated in 3.4, use name instead)
    - [ ] labels
    - [ ] name (3.4+)
- [ ] Network configuration reference
    - [x] driver
        - [x] bridge
        - [x] overlay
        - [x] host or none
    - [ ] driver_opts
    - [ ] attachable (3.2+)
    - [ ] ~~enable_ipv6~~
    - [ ] ipam
    - [ ] internal
    - [ ] labels
    - [x] external (deprecated in 3.5, use name instead)
    - [ ] name (3.5+)
- [ ] configs configuration reference
- [ ] secrets configuration reference

## Testing Process

The tests were developed using the following process:
1. Writing `test_x.yml`
2. `docker stack deploy -c test_x.yml test_x`
3. `curl --no-buffer -XGET --unix-socket /var/run/docker.sock http:/v1.37/services/test_x_MyServiceName | python -m json.tool` --> `test_x.json`
4. `curl --no-buffer -XGET --unix-socket /var/run/docker.sock http:/v1.37/networks/text_x_default | python -m json.tool` --> `test_x_net.json`
    - Repeat for other networks
5. `curl --no-buffer -XGET --unix-socket /var/run/docker.sock http:/v1.37/volumes/test_x_volumeName | python -m json.tool` --> `test_x_vol.json`
    - Repeat for other volumes
6. `npm run test`

A More automated method (that requires root) could be
1. Write `test_x_src.yml` file to be used for deploying
2. Write `test_x.yml` to be used as expected output
3. Deploy `test_x_src.yml`
4. Use a script to get related networks and services
5. Compose stack file
6. Compare stack files

## Things that are not so great
- Expected yml requires specific order of keys
- Expected yml tests multiple functions
