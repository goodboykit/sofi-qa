export type Config = {
    task: string;
    scenario: string;
    model_name: string;
    input_format: string;
    expected_output_format: string;
    num_goldens: number;
    reasoning_weight: number;
    multicontext_weight: number;
    num_evolutions: number;
    api_key: string;
    eval_metric_name?: string;
    eval_metric_criteria?: string;
    eval_threshold?: number;
    eval_timeout?: number;
    max_user_simulations?: number;
};

export interface Document {
    id: string;
    name: string;
    type: string;
    size: number;
    status: string;
    uploadDate: string;
}

export interface LogEntry {
    id: number;
    message: string;
    type: 'info' | 'success' | 'error' | 'warning' | 'primary';
    time: string;
}

export interface Results {
    singleTurn: number;
    multiTurn: number;
    duration: string;
}

export interface EvalResult {
    tests: any[];
    passed: number;
    failed: number;
    total: number;
}
