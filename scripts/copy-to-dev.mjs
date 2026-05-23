import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import * as Constants from './Constants.mjs'

// UWP版Minecraft路径
// const minecraftPath = path.join(os.homedir(), 'AppData/Local/Packages/Microsoft.MinecraftUWP_8wekyb3d8bbwe/LocalState/games/com.mojang');
// GDK版Minecraft路径
const minecraftPath = path.join(os.homedir(), 'AppData/Roaming/Minecraft Bedrock/Users/Shared/games/com.mojang');
const devBehaviorPacks = path.join(minecraftPath, 'development_behavior_packs');
const devResourcePacks = path.join(minecraftPath, 'development_resource_packs');

async function copyFolderWithSource(source, destination) {
  const folderName = basename(source);
  const targetPath = join(destination, folderName);
  
  await fs.cp(source, targetPath, { recursive: true });
  console.log(`copy: ${source} to ${targetPath}`);
  
  return targetPath;
}

if (fs.existsSync(Constants.BP_BuildPath) && fs.existsSync(Constants.RP_BuildPath)) {
    copyFolderWithSource(Constants.BP_BuildPath, devBehaviorPacks);
    copyFolderWithSource(Constants.RP_BuildPath, devResourcePacks);
}
