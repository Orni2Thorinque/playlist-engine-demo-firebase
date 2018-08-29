export interface PieData {
	colors: string[];
	data: { name: string, value: number }[];
};

export interface ForceMapData {
	colors: string[];
	data: { value: string }[];
	links: Link[];
};

export interface Link {
	source: string;
	target: string;
};