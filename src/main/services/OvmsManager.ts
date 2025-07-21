// src/main/services/OvmsManager.ts
import { exec } from 'node:child_process';
//import fs from 'node:fs/promises'
//import path from 'node:path'
import * as fs from 'fs-extra';
import * as path from 'path';
import { promisify } from 'node:util'

import Logger from 'electron-log';


const execAsync = promisify(exec);

interface OvmsProcess {
  pid: number;
  path: string;
  workingDirectory: string;
}

interface ModelConfig {
  name: string;
  base_path: string;
}

interface OvmsConfig {
  mediapipe_config_list: ModelConfig[];
}

export class OvmsManager {
  private ovms: OvmsProcess | null = null;
  
  constructor() {
    
  }

  /**
   * Initialize OVMS by finding the executable path and working directory
   */
  private async initializeOvms(): Promise<Boolean> {
    
    // Use PowerShell to find ovms.exe processes with their paths
    const psCommand = `Get-Process -Name "ovms" -ErrorAction SilentlyContinue | Select-Object Id, Path | ConvertTo-Json`;
    const { stdout } = await execAsync(`powershell -Command "${psCommand}"`);

    if (!stdout.trim()) {
      console.error('Command to find OVMS process returned no output');
      return false;
    }
    console.info('OVMS process output:', stdout);
    
    const processes = JSON.parse(stdout);
    const processList = Array.isArray(processes) ? processes : [processes];
    
    // Find the first process with a valid path
    for (const process of processList) {
      this.ovms = {
        pid: process.Id,
        path: process.Path,
        workingDirectory: path.dirname(process.Path)
      };
      return true;
    }
    
    return this.ovms !== null;
  }

  /**
   * Check if the Model Name and ID are valid, they are valid only if they are not used in the config.json
   * @param modelName Name of the model to check
   * @param modelId ID of the model to check
   */
  public async isNameAndIDAvalid(modelName: string, modelId: string): Promise<Boolean> {
    if (!modelName || !modelId) {
      Logger.error('Model name and ID cannot be empty');
      return false;
    }
    if (!this.ovms) {
      if (!(await this.initializeOvms())) {
        Logger.error('Failed to initialize OVMS.');
        return false;
      }
    }
    const configPath = path.join(this.ovms!.workingDirectory, 'models', 'config.json');
    try {
      if (!await fs.pathExists(configPath)) {
        Logger.warn('Config file does not exist:', configPath);
        return false;
      }

      const config: OvmsConfig = await fs.readJson(configPath);
      if (!config.mediapipe_config_list) {
        Logger.warn('No mediapipe_config_list found in config');
        return false;
      }

      // Check if the model name or ID already exists in the config
      const exists = config.mediapipe_config_list.some(model => 
        model.name === modelName || model.base_path === modelId
      );
      if (exists) {
        Logger.warn(`Model with name "${modelName}" or ID "${modelId}" already exists in the config`);
        return false;
      }
      

    } catch (error) {
      Logger.error('Failed to check model existence:', error);
      return false;
    }

    return true;
  }

  /**
   * Add a model to OVMS by downloading it
   * @param modelName Name of the model to add
   * @param modelId ID of the model to download
   * @param timeout Timeout in milliseconds for the download process (default is 300 seconds)
   */
  public async addModel(modelName: string, modelId: string, timeout: number=300) : Promise<{ success: boolean; message?: string }> {
    Logger.info(`Adding model: ${modelName} with ID: ${modelId}`);

    if (!this.ovms) {
      if (!(await this.initializeOvms())) {
        Logger.error('Failed to initialize OVMS.');
        return { success: false, message: 'OVMS process not found' };
      }
    }

    try {
      // check the name and id
      if (!(await this.isNameAndIDAvalid(modelName, modelId))) {
        Logger.error('Model name or ID is not valid');
        return { success: false, message: 'Model name or ID is already exist!' };
      }

      // Run the download command
      const command = `"${this.ovms?.path}" --pull --model_repository_path "${this.ovms?.workingDirectory}/models" --source_model "${modelId}"`;
      Logger.info(`Running command: ${command}`);
      
      const { stdout } = await execAsync(command, {
        cwd: this.ovms?.workingDirectory,
        timeout: timeout * 1000 // 10 minutes timeout
      });

      Logger.info('Model download completed');
      Logger.debug('Command output:', stdout);
      
    } catch (error) {
      Logger.error('Failed to add model:', error);
      return { success: false, message : `Download model ${modelId} failed, please check following items and try it again:<p>- the model id</p><p>- timeout value</p><p>- network connection and proxy</p><p>- environment variable HF_TOKEN</p>` };
    }

    // Update config file
    if (!(await this.updateModelConfig(modelName, modelId))) {
      Logger.error('Failed to update model config');
      return { success: false, message: 'Failed to update model config' };
    }

    Logger.info(`Model ${modelName} added successfully with ID ${modelId}`);
    return { success: true };
  }

  /**
   * check if the model id exists in the OVMS configuration
   * @param modelId ID of the model to check
   */
  public async checkModelExists(modelId: string): Promise<boolean> {
    if (!this.ovms) {
      if (!(await this.initializeOvms())) {
        Logger.error('Failed to initialize OVMS.');
        return false;
      }
    }

    const configPath = path.join(this.ovms!.workingDirectory, 'models', 'config.json');
    try {
      if (!await fs.pathExists(configPath)) {
        Logger.warn('Config file does not exist:', configPath);
        return false;
      }

      const config: OvmsConfig = await fs.readJson(configPath);
      if (!config.mediapipe_config_list) {
        Logger.warn('No mediapipe_config_list found in config');
        return false;
      }

      return config.mediapipe_config_list.some(model => model.base_path === modelId);
    } catch (error) {
      Logger.error('Failed to check model existence:', error);
      return false;
    }
  }

  /**
   * Update the model configuration file
   */
  public async updateModelConfig(modelName: string, modelId: string): Promise<Boolean> {
    if (!this.ovms) {
      if (!(await this.initializeOvms())) {
        Logger.error('Failed to initialize OVMS.');
        return false;
      }
    }
    
    try {
      const configPath = path.join(this.ovms!.workingDirectory, 'models', 'config.json');

      // Ensure the models directory exists
      await fs.ensureDir(path.dirname(configPath));
      let config: OvmsConfig;
      
      // Read existing config or create new one
      if (await fs.pathExists(configPath)) {
        config = await fs.readJson(configPath);
      } else {
        config = { mediapipe_config_list: [] };
      }
      
      // Ensure mediapipe_config_list exists
      if (!config.mediapipe_config_list) {
        config.mediapipe_config_list = [];
      }
      
      // Add new model config
      const newModelConfig: ModelConfig = {
        name: modelName,
        base_path: modelId
      };
      
      // Check if model already exists, if so, update it
      const existingIndex = config.mediapipe_config_list.findIndex(
        model => model.name === modelName || model.base_path === modelId
      );
      
      if (existingIndex >= 0) {
        config.mediapipe_config_list[existingIndex] = newModelConfig;
        Logger.info(`Updated existing model config: ${modelName}`);

        return false;
      } else {
        config.mediapipe_config_list.push(newModelConfig);
        Logger.info(`Added new model config: ${modelName}`);
      }
      
      // Write config back to file
      await fs.writeJson(configPath, config, { spaces: 2 });
      Logger.info(`Config file updated: ${configPath}`);
      
    } catch (error) {
      Logger.error('Failed to update model config:', error);
      return false;
    }
    return true;
  }

  /**
   * Get all models from OVMS config, filtered for image generation models
   * @returns Array of model configurations
   */
  public async getModels(): Promise<ModelConfig[]> {
    if (!this.ovms) {
      if (!(await this.initializeOvms())) {
        Logger.error('Failed to initialize OVMS.');
        return [];
      }
    }

    const configPath = path.join(this.ovms!.workingDirectory, 'models', 'config.json');
    try {
      if (!await fs.pathExists(configPath)) {
        Logger.warn('Config file does not exist:', configPath);
        return [];
      }

      const config: OvmsConfig = await fs.readJson(configPath);
      if (!config.mediapipe_config_list) {
        Logger.warn('No mediapipe_config_list found in config');
        return [];
      }

      // Filter models for image generation (SD, Stable-Diffusion, Stable Diffusion, FLUX)
      const imageGenerationModels = config.mediapipe_config_list.filter(model => {
        const modelName = model.name.toLowerCase();
        return modelName.startsWith('sd') || 
               modelName.startsWith('stable-diffusion') || 
               modelName.startsWith('stable diffusion') || 
               modelName.startsWith('flux');
      });

      Logger.info(`Found ${imageGenerationModels.length} image generation models`);
      return imageGenerationModels;

    } catch (error) {
      Logger.error('Failed to get models:', error);
      return [];
    }
  }
}
