import { type CSSProperties } from 'react';
import { NumberInput as MantineNumberInput } from '@mantine/core';

interface NumberInputProps {
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    className?: string;
    style?: CSSProperties;
    disabled?: boolean;
}

export function NumberInput({
    value,
    onChange,
    min = 0,
    max = 100,
    step = 1,
    className = '',
    style = {},
    disabled = false
}: NumberInputProps) {
    return (
        <MantineNumberInput
            value={value}
            onChange={(val) => {
                if (typeof val === 'number') {
                    onChange(val);
                } else if (typeof val === 'string' && val !== '') {
                    const parsed = parseInt(val, 10);
                    if (!isNaN(parsed)) {
                        onChange(parsed);
                    }
                }
            }}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            className={className}
            allowDecimal={false}
            size="sm"
            radius="md"
            styles={{
                input: {
                    backgroundColor: 'var(--bg-input, #1e1e1e)',
                    borderColor: 'var(--border, #2a2a2a)',
                    color: 'var(--text-primary, #ffffff)',
                    fontSize: '14px',
                    height: '36px',
                    ...style
                },
                control: {
                    borderLeftColor: 'var(--border, #2a2a2a)',
                    color: 'var(--text-secondary, #a0a0a0)',
                }
            }}
            style={style}
        />
    );
}
