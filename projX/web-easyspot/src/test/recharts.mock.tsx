import type { ReactNode } from 'react';

const Mock = ({ children }: { children?: ReactNode }) => <>{children ?? null}</>;

export const ResponsiveContainer = Mock;
export const AreaChart = Mock;
export const BarChart = Mock;
export const LineChart = Mock;
export const PieChart = Mock;
export const Area = () => null;
export const Bar = () => null;
export const Line = () => null;
export const Pie = () => null;
export const Cell = () => null;
export const XAxis = () => null;
export const YAxis = () => null;
export const CartesianGrid = () => null;
export const Tooltip = () => null;
