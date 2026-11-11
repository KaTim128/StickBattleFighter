import { Assets, type Texture } from 'pixi.js';
import { type AssetFailure, AssetLoader } from '../core/asset-loader';

/** Texture loader backed by Pixi's Assets, with the handled-error path from core. */
export function createTextureLoader(onFailure: (failure: AssetFailure) => void): AssetLoader<Texture> {
  return new AssetLoader<Texture>((url) => Assets.load<Texture>(url), onFailure);
}
