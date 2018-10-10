export interface Port {
    published: number;
    target: number;
    protocol: string;
    mode: string;
}

export interface Mount {
    type: string;
    source: string;
    target: string;
}

export interface StackConfig {
    external?: boolean;
}

export interface Service {
    image: string;
    environment?: string[];
    labels?: {[name: string]: string};
    ports?: Port[];
    networks?: string[];
    volumes?: Mount[];
    deploy?: {
        mode: "replicated" | "global";
        replicas?: number;
        labels?: {[name: string]: string};
    };
    configs?: string[];
}

export interface StackNetwork {
    driver?: string;
    external?: boolean;
}

export interface StackVolume {
    driver?: string;
    external?: boolean;
}

export interface StackFile {
    version: string;
    services: {[name: string]: Service};
    networks?: {[name: string]: StackNetwork};
    volumes?: {[name: string]: StackVolume};
}
