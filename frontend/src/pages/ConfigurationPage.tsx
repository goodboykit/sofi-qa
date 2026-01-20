import type { Config } from '../types';

interface ConfigurationPageProps {
    config: Config;
    setConfig: (config: Config) => void;
    saveConfig: () => void;
}

export function ConfigurationPage({ config, setConfig, saveConfig }: ConfigurationPageProps) {
    return (
        <main className="main" style={{ maxWidth: '1200px', margin: '0 auto', overflow: 'hidden' }}>
            <div className="card-container" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div className="documents-card" style={{ height: '100%' }}>
                    <div className="documents-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="documents-title">System Configuration</span>
                    </div>

                    <div className="documents-body" style={{ padding: '32px', overflowY: 'auto' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px' }}>

                            {/* Left Column: Global Synthesis Settings */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                <div>
                                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-primary)' }}>
                                        Global Synthesis Settings
                                    </h3>
                                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                        Control how the AI generates synthetic data. Use these settings to define the personality and difficulty of the Q&A pairs.
                                    </p>
                                    <div style={{ height: '1px', background: 'var(--border)', marginTop: '12px', marginBottom: '16px' }} />
                                </div>

                                {/* Model Selection */}
                                <div className="form-group">
                                    <label className="label-with-tooltip">
                                        AI Model
                                        <span className="info-icon">i
                                            <span className="tooltip-text">Select the brain used for generating data. 'gpt-4o-mini' is usually sufficient.</span>
                                        </span>
                                    </label>
                                    <select
                                        className="form-input"
                                        style={{ minHeight: '44px' }}
                                        value={config.model_name}
                                        onChange={e => setConfig({ ...config, model_name: e.target.value })}
                                    >
                                        <option value="gpt-4o-mini">gpt-4o-mini</option>
                                        <option value="gpt-4o">gpt-4o</option>
                                        <option value="gpt-3.5-turbo">gpt-3.5-turbo (Legacy)</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="label-with-tooltip">
                                        Task Description
                                        <span className="info-icon">i
                                            <span className="tooltip-text">Define the persona or role the AI should adopt (e.g., 'You are a helpful medical assistant').</span>
                                        </span>
                                    </label>
                                    <textarea
                                        className="textarea form-input"
                                        rows={3}
                                        style={{ minHeight: '100px', resize: 'vertical' }}
                                        placeholder="e.g. You are a helpful assistant..."
                                        value={config.task}
                                        onChange={e => setConfig({ ...config, task: e.target.value })}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="label-with-tooltip">
                                        Scenario
                                        <span className="info-icon">i
                                            <span className="tooltip-text">Describe the context or situation for the data generation (e.g., 'A user asks about policy details').</span>
                                        </span>
                                    </label>
                                    <textarea
                                        className="textarea form-input"
                                        rows={3}
                                        style={{ minHeight: '100px', resize: 'vertical' }}
                                        placeholder="e.g. A user is asking about..."
                                        value={config.scenario}
                                        onChange={e => setConfig({ ...config, scenario: e.target.value })}
                                    />
                                </div>

                                {/* Formatting */}
                                <div className="form-group">
                                    <label className="label-with-tooltip">
                                        Input Style
                                        <span className="info-icon">i
                                            <span className="tooltip-text">Format of the user query (e.g., 'A short, direct question').</span>
                                        </span>
                                    </label>
                                    <textarea
                                        className="form-input"
                                        rows={2}
                                        style={{ resize: 'vertical', minHeight: '100px', paddingTop: '10px' }}
                                        value={config.input_format}
                                        onChange={e => setConfig({ ...config, input_format: e.target.value })}
                                        placeholder="e.g. Short queries"
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="label-with-tooltip">
                                        Output Style
                                        <span className="info-icon">i
                                            <span className="tooltip-text">Format of the expected answer (e.g., 'A detailed paragraph with citations').</span>
                                        </span>
                                    </label>
                                    <textarea
                                        className="form-input"
                                        rows={2}
                                        style={{ resize: 'vertical', minHeight: '100px', paddingTop: '10px' }}
                                        value={config.expected_output_format}
                                        onChange={e => setConfig({ ...config, expected_output_format: e.target.value })}
                                        placeholder="e.g. Detailed answers"
                                    />
                                </div>

                                {/* Data Volume & Complexity Grid */}
                                <div style={{ background: 'var(--bg-card-hover)', padding: '16px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginBottom: '24px' }}>
                                    <label className="label-with-tooltip" style={{ color: 'var(--accent)', fontWeight: 600, marginBottom: '12px', display: 'flex' }}>
                                        GENERATION SCALE
                                        <span className="info-icon" style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}>i
                                            <span className="tooltip-text">Control the quantity and difficulty of the synthetic data.</span>
                                        </span>
                                    </label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label className="label-with-tooltip">
                                                Data Volume
                                                <span className="info-icon">i
                                                    <span className="tooltip-text">Number of synthetic Q&A pairs to generate per source document.</span>
                                                </span>
                                            </label>
                                            <input
                                                type="number"
                                                className="form-input"
                                                min="1"
                                                max="50"
                                                value={config.num_goldens}
                                                onChange={e => setConfig({ ...config, num_goldens: parseInt(e.target.value) || 5 })}
                                            />
                                        </div>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label className="label-with-tooltip">
                                                Complexity
                                                <span className="info-icon">i
                                                    <span className="tooltip-text">Number of evolution steps to complicate the query (higher = harder questions).</span>
                                                </span>
                                            </label>
                                            <input
                                                type="number"
                                                className="form-input"
                                                min="1"
                                                max="5"
                                                value={config.num_evolutions}
                                                onChange={e => setConfig({ ...config, num_evolutions: parseInt(e.target.value) || 1 })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Weights Grid */}
                                <div style={{ background: 'var(--bg-card-hover)', padding: '16px', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                                    <label className="label-with-tooltip" style={{ color: 'var(--accent)', fontWeight: 600, marginBottom: '16px', display: 'flex' }}>
                                        GENERATION MIX
                                        <span className="info-icon" style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}>i
                                            <span className="tooltip-text">Adjust the balance between different types of synthetic data generation.</span>
                                        </span>
                                    </label>

                                    <div className="form-group" style={{ marginBottom: '16px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <label style={{ fontSize: '13px' }}>Reasoning Focus</label>
                                            <span className="range-value">{config.reasoning_weight}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <input
                                                type="range"
                                                min="0" max="1" step="0.1"
                                                style={{ flex: 1, backgroundSize: `${(config.reasoning_weight || 0) * 100}% 100%` }}
                                                value={config.reasoning_weight}
                                                onChange={e => setConfig({ ...config, reasoning_weight: parseFloat(e.target.value) })}
                                            />
                                        </div>
                                    </div>

                                    <div className="form-group" style={{ marginBottom: '0' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <label style={{ fontSize: '13px' }}>Multi-Context Focus</label>
                                            <span className="range-value">{config.multicontext_weight}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <input
                                                type="range"
                                                min="0" max="1" step="0.1"
                                                style={{ flex: 1, backgroundSize: `${(config.multicontext_weight || 0) * 100}% 100%` }}
                                                value={config.multicontext_weight}
                                                onChange={e => setConfig({ ...config, multicontext_weight: parseFloat(e.target.value) })}
                                            />
                                        </div>
                                    </div>
                                </div>

                            </div>

                            {/* Right Column: Evaluation Settings */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                <div>
                                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-primary)' }}>
                                        Evaluation Settings
                                    </h3>
                                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                        Define what "Quality" looks like. The system will use these rules to grade the generated chatbot responses.
                                    </p>
                                    <div style={{ height: '1px', background: 'var(--border)', marginTop: '12px', marginBottom: '16px' }} />
                                </div>

                                <div className="form-group">
                                    <label className="label-with-tooltip">
                                        Metric Name
                                        <span className="info-icon">i
                                            <span className="tooltip-text">Name of the custom metric used for evaluation (e.g., 'Correctness').</span>
                                        </span>
                                    </label>
                                    <textarea
                                        className="form-input"
                                        rows={1}
                                        style={{ resize: 'vertical', minHeight: '50px', paddingTop: '10px', height: 'auto' }}
                                        value={config.eval_metric_name || ''}
                                        onChange={e => setConfig({ ...config, eval_metric_name: e.target.value })}
                                        placeholder="e.g. Professionalism, Accuracy, Empathy"
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="label-with-tooltip">
                                        Grading Criteria
                                        <span className="info-icon">i
                                            <span className="tooltip-text">Describe exactly what makes a response 'Good' vs 'Bad' for the AI judge.</span>
                                        </span>
                                    </label>
                                    <textarea
                                        className="form-input"
                                        rows={6}
                                        style={{ resize: 'vertical', minHeight: '120px', fontSize: '13px', lineHeight: '1.6', height: 'auto', paddingTop: '12px' }}
                                        value={config.eval_metric_criteria || ''}
                                        onChange={e => setConfig({ ...config, eval_metric_criteria: e.target.value })}
                                        placeholder="Describe exactly what makes a response 'Good' vs 'Bad'. e.g., 'The answer must be polite, concise, and contain at least one citation.'"
                                    />
                                </div>

                                {/* Execution Settings Container */}
                                <div style={{ background: 'var(--bg-card-hover)', padding: '16px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginTop: '8px' }}>
                                    <label className="label-with-tooltip" style={{ color: 'var(--accent)', fontWeight: 600, marginBottom: '16px', display: 'flex' }}>
                                        EXECUTION CONTROL
                                        <span className="info-icon" style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}>i
                                            <span className="tooltip-text">Fine-tune how the evaluation tests are executed and graded.</span>
                                        </span>
                                    </label>

                                    <div className="form-group" style={{ marginBottom: '24px' }}>
                                        <label className="label-with-tooltip">
                                            Pass Threshold
                                            <span className="info-icon">i
                                                <span className="tooltip-text">Minimum score (0 to 1) required to pass the test. Higher is stricter.</span>
                                            </span>
                                        </label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <input
                                                type="range"
                                                min="0" max="1" step="0.1"
                                                style={{ flex: 1, backgroundSize: `${(config.eval_threshold || 0) * 100}% 100%` }}
                                                value={config.eval_threshold}
                                                onChange={e => setConfig({ ...config, eval_threshold: parseFloat(e.target.value) })}
                                            />
                                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', width: '24px', textAlign: 'right' }}>{config.eval_threshold}</span>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '20px' }}>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label className="label-with-tooltip">
                                                Test Timeout
                                                <span className="info-icon">i
                                                    <span className="tooltip-text">
                                                        Maximum time allowed per test in seconds.
                                                        <br /><br />
                                                        <strong>Recommended: 60s</strong>
                                                        <br />
                                                        • Lower (e.g., 30s): Saves credits, but might timeout.
                                                        <br />
                                                        • Higher (e.g., 300s): Thorough, but costs more.
                                                    </span>
                                                </span>
                                            </label>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <input
                                                    type="number"
                                                    className="form-input"
                                                    min="10" max="300" step="10"
                                                    style={{ flex: 1 }}
                                                    value={config.eval_timeout || 60}
                                                    onChange={e => setConfig({ ...config, eval_timeout: parseInt(e.target.value) || 60 })}
                                                />
                                                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>seconds</span>
                                            </div>
                                        </div>

                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label className="label-with-tooltip">
                                                Conversation Rounds
                                                <span className="info-icon">i
                                                    <span className="tooltip-text">
                                                        Number of back-and-forth turns to simulate.
                                                        <br /><br />
                                                        <strong>Recommended: 2 rounds</strong>
                                                        <br />
                                                        • 2 rounds: Good balance of cost & quality.
                                                        <br />
                                                        • 5 rounds: Very deep testing, higher API cost.
                                                    </span>
                                                </span>
                                            </label>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <input
                                                    type="number"
                                                    className="form-input"
                                                    min="1" max="5" step="1"
                                                    style={{ flex: 1 }}
                                                    value={config.max_user_simulations || 2}
                                                    onChange={e => setConfig({ ...config, max_user_simulations: parseInt(e.target.value) || 2 })}
                                                />
                                                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>rounds</span>
                                            </div>
                                        </div>
                                    </div>

                                </div>

                                <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                                    <button className="btn btn-primary" onClick={saveConfig}>
                                        Save Configuration
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
