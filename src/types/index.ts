export interface ExtractorOptions {
  atlasPath: string;
  skelPath: string;
  skin?: string;
  animation?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
  frame: number;
}

/**
 * Atlas解析の結果を表すインターフェース
 */
export interface AtlasData {
  images: string[];
  regions: AtlasRegion[];
  skins: string[];
}

/**
 * Atlasリージョンの情報を表すインターフェース
 */
export interface AtlasRegion {
  name: string;
  image: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotate: boolean;
}
