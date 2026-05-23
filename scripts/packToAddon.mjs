import * as fs from 'fs'
import * as path from 'path'
import AdmZip from 'adm-zip'
import * as Constants from './Constants.mjs'

function copyRecursive(src, dest) {
    if (!fs.existsSync(src)) return;

    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }
    
    const items = fs.readdirSync(src);
    items.forEach(item => {
        const srcPath = path.join(src, item);
        const destPath = path.join(dest, item);
        
        if (fs.statSync(srcPath).isDirectory()) {
            copyRecursive(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    });
}

if (fs.existsSync(Constants.BP_DefinitionPath) && fs.existsSync(Constants.RP_Path)) {
    console.log('Copy BP definition files');
    copyRecursive(Constants.BP_DefinitionPath, Constants.BP_BuildPath);
    console.log('Copy RP resources files');
    copyRecursive(Constants.RP_Path, Constants.RP_BuildPath);

    // auto update
    const tmepJsonPath = "./scripts/temp.json"
    const tempJson = JSON.parse(fs.readFileSync(tmepJsonPath).toString())
    tempJson.version[2] += 1;
    fs.writeFileSync(tmepJsonPath, JSON.stringify(tempJson))

    function processManifest(filePath) {
        const json = JSON.parse(fs.readFileSync(filePath).toString());
        json.header.version = tempJson.version;
        for (const module of json.modules) {
            module.version = tempJson.version;
        }
        fs.writeFileSync(filePath, JSON.stringify(json, null, 2))
    }

    processManifest(path.join(Constants.BP_BuildPath, "manifest.json"))
    processManifest(path.join(Constants.RP_BuildPath, "manifest.json"))

    console.log("packing to zip(mcaddon)...");
    const zip = new AdmZip()
    const buildPath = "./build"
    const folders = fs.readdirSync(buildPath, { withFileTypes: true })
        .filter(item => item.isDirectory());
    folders.forEach(folder => {
        const folderPath = path.join(buildPath, folder.name);
        zip.addLocalFolder(folderPath, folder.name);
    })
    zip.writeZip(path.join(buildPath, (Constants.OutputAddonFileName.replaceAll("[VERSION]", tempJson.version.join(".")) + ".mcaddon")))
    console.log("Done!")
}