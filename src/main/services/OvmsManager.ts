// src/main/services/OvmsManager.ts
import { exec } from 'node:child_process';
//import fs from 'node:fs/promises'
//import path from 'node:path'
import * as fs from 'fs-extra';
import * as path from 'path';
import { promisify } from 'node:util'
import { homedir } from 'node:os';

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
   * Recursively terminate a process and all its child processes
   * @param pid Process ID to terminate
   * @returns Promise<{ success: boolean; message?: string }>
   */
  private async terminalProcess(pid: number): Promise<{ success: boolean; message?: string }> {
    try {
      // Check if the process is running
      const processCheckCommand = `Get-Process -Id ${pid} -ErrorAction SilentlyContinue | Select-Object Id | ConvertTo-Json`;
      const { stdout: processStdout } = await execAsync(`powershell -Command "${processCheckCommand}"`);

      if (!processStdout.trim()) {
        Logger.info(`Process with PID ${pid} is not running`);
        return { success: true, message: `Process with PID ${pid} is not running` };
      }

      // Find child processes
      const childProcessCommand = `Get-WmiObject -Class Win32_Process | Where-Object { $_.ParentProcessId -eq ${pid} } | Select-Object ProcessId | ConvertTo-Json`;
      const { stdout: childStdout } = await execAsync(`powershell -Command "${childProcessCommand}"`);

      // If there are child processes, terminate them first
      if (childStdout.trim()) {
        const childProcesses = JSON.parse(childStdout);
        const childList = Array.isArray(childProcesses) ? childProcesses : [childProcesses];
        
        Logger.info(`Found ${childList.length} child processes for PID ${pid}`);
        
        // Recursively terminate each child process
        for (const childProcess of childList) {
          const childPid = childProcess.ProcessId;
          Logger.info(`Terminating child process PID: ${childPid}`);
          await this.terminalProcess(childPid);
        }
      } else {
        Logger.info(`No child processes found for PID ${pid}`);
      }

      // Finally, terminate the parent process
      const killCommand = `Stop-Process -Id ${pid} -Force -ErrorAction SilentlyContinue`;
      await execAsync(`powershell -Command "${killCommand}"`);
      Logger.info(`Terminated process with PID: ${pid}`);

      return { success: true, message: `Process ${pid} and all child processes terminated successfully` };

    } catch (error) {
      Logger.error(`Failed to terminate process ${pid}:`, error);
      return { success: false, message: `Failed to terminate process ${pid}` };
    }
  }

  /**
   * Stop OVMS process if it's running
   * @returns Promise<{ success: boolean; message?: string }>
   */
  public async stopOvms(): Promise<{ success: boolean; message?: string }> {
    try {
      // Check if OVMS process is running
      const psCommand = `Get-Process -Name "ovms" -ErrorAction SilentlyContinue | Select-Object Id, Path | ConvertTo-Json`;
      const { stdout } = await execAsync(`powershell -Command "${psCommand}"`);

      if (!stdout.trim()) {
        Logger.info('OVMS process is not running');
        return { success: true, message: 'OVMS process is not running' };
      }

      const processes = JSON.parse(stdout);
      const processList = Array.isArray(processes) ? processes : [processes];
      
      if (processList.length === 0) {
        Logger.info('OVMS process is not running');
        return { success: true, message: 'OVMS process is not running' };
      }

      // Terminate all OVMS processes
      for (const process of processList) {
        const killCommand = `Stop-Process -Id ${process.Id} -Force -ErrorAction SilentlyContinue`;
        await execAsync(`powershell -Command "${killCommand}"`);
        Logger.info(`Terminated OVMS process with PID: ${process.Id}`);
      }

      // Reset the ovms instance
      this.ovms = null;

      Logger.info('OVMS process stopped successfully');
      return { success: true, message: 'OVMS process stopped successfully' };

    } catch (error) {
      Logger.error('Failed to stop OVMS process:', error);
      return { success: false, message: 'Failed to stop OVMS process' };
    }
  }

  /**
   * Run OVMS by ensuring config.json exists and executing run.bat
   * @returns Promise<{ success: boolean; message?: string }>
   */
  public async runOvms(): Promise<{ success: boolean; message?: string }> {
    const homeDir = homedir();
    const ovmsDir = path.join(homeDir, '.cherrystudio', 'ovms', 'ovms');
    const configPath = path.join(ovmsDir, 'models', 'config.json');
    const runBatPath = path.join(ovmsDir, 'run.bat');

    try {
      // Check if config.json exists, if not create it with default content
      if (!await fs.pathExists(configPath)) {
        Logger.info('Config file does not exist, creating:', configPath);
        
        // Ensure the models directory exists
        await fs.ensureDir(path.dirname(configPath));
        
        // Create config.json with default content
        const defaultConfig = {
          "mediapipe_config_list": [],
          "model_config_list": []
        };
        
        await fs.writeJson(configPath, defaultConfig, { spaces: 2 });
        Logger.info('Config file created:', configPath);
      }

      // Check if run.bat exists
      if (!await fs.pathExists(runBatPath)) {
        Logger.error('run.bat not found at:', runBatPath);
        return { success: false, message: 'run.bat not found' };
      }

      // Run run.bat without waiting for it to complete
      Logger.info('Starting OVMS with run.bat:', runBatPath);
      exec(`"${runBatPath}"`, { cwd: ovmsDir }, (error) => {
        if (error) {
          Logger.error('Error running run.bat:', error);
        }
      });

      Logger.info('OVMS started successfully');
      return { success: true };

    } catch (error) {
      Logger.error('Failed to run OVMS:', error);
      return { success: false, message: 'Failed to run OVMS' };
    }
  }

  /**
   * Get OVMS status - checks installation and running status
   * @returns 'not-installed' | 'not-running' | 'running'
   */
  public async getOvmsStatus(): Promise<'not-installed' | 'not-running' | 'running'> {
    const homeDir = homedir();
    const ovmsPath = path.join(homeDir, '.cherrystudio', 'ovms', 'ovms', 'ovms.exe');
    
    try {
      // Check if OVMS executable exists
      if (!await fs.pathExists(ovmsPath)) {
        Logger.info('OVMS executable not found at:', ovmsPath);
        return 'not-installed';
      }

      // Check if OVMS process is running
      //const psCommand = `Get-Process -Name "ovms" -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq "${ovmsPath.replace(/\\/g, '\\\\')}" } | Select-Object Id | ConvertTo-Json`;
      //const { stdout } = await execAsync(`powershell -Command "${psCommand}"`);
      const psCommand = `Get-Process -Name "ovms" -ErrorAction SilentlyContinue | Select-Object Id, Path | ConvertTo-Json`;
      const { stdout } = await execAsync(`powershell -Command "${psCommand}"`);

      if (!stdout.trim()) {
        Logger.info('OVMS process not running');
        return 'not-running';
      }

      const processes = JSON.parse(stdout);
      const processList = Array.isArray(processes) ? processes : [processes];
      
      if (processList.length > 0) {
        Logger.info('OVMS process is running');
        return 'running';
      } else {
        Logger.info('OVMS process not running');
        return 'not-running';
      }
    } catch (error) {
      Logger.error('Failed to check OVMS status:', error);
      return 'not-running';
    }
  }

  /**
   * Initialize OVMS by finding the executable path and working directory
   */
  public async initializeOvms(): Promise<Boolean> {
    
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

    const homeDir = homedir();
    const configPath = path.join(homeDir, '.cherrystudio', 'ovms', 'ovms', 'models', 'config.json');
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
   * @param modelSource Model Source: huggingface, hf-mirror and modelscope, default is huggingface
   */
  public async addModel(modelName: string, modelId: string, modelSource: string) : Promise<{ success: boolean; message?: string }> {
    Logger.info(`Adding model: ${modelName} with ID: ${modelId}, Source: ${modelSource}`);

    const homeDir = homedir();
    const ovdndDir = path.join(homeDir, '.cherrystudio', 'ovms', 'ovms');

    try {
      // check the name and id
      if (!(await this.isNameAndIDAvalid(modelName, modelId))) {
        Logger.error('Model name or ID is not valid');
        return { success: false, message: 'Model name or ID is already exist!' };
      }

      const pathModel = path.join(ovdndDir, 'models', modelId);
      // remove the model directory if it exists
      if (await fs.pathExists(pathModel)) {
        Logger.info(`Removing existing model directory: ${pathModel}`);
        await fs.remove(pathModel);
      }

      // Use ovdnd.exe for downloading instead of ovms.exe
      const ovdndPath = path.join(ovdndDir, 'ovdnd.exe');
      const command = `"${ovdndPath}" --pull --model_repository_path "${ovdndDir}/models" --source_model "${modelId}" --model_name "${modelName}" --target_device GPU --overwrite_models`;
      console.log(`Running command: ${command}`);
      
      const { stdout } = await execAsync(command, {
        env: {
          ...process.env,
          OVMS_DIR: ovdndDir,
          PYTHONHOME: path.join(ovdndDir, 'python'),
          PATH: `${process.env.PATH};${ovdndDir};${path.join(ovdndDir, 'python')}`,
          HF_ENDPOINT: modelSource
        },
        cwd: ovdndDir
      });

      Logger.info('Model download completed');
      Logger.debug('Command output:', stdout);
      
    } catch (error) {
      Logger.error('Failed to add model:', error);
      return { success: false, message : `Download model ${modelId} failed, please check following items and try it again:<p>- the model id</p><p>- network connection and proxy</p>` };
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
   * Stop the model download process if it's running
   * @returns Promise<{ success: boolean; message?: string }>
   */
  public async stopAddModel(): Promise<{ success: boolean; message?: string }> {
    try {
      // Check if ovdnd.exe process is running
      const psCommand = `Get-Process -Name "ovdnd" -ErrorAction SilentlyContinue | Select-Object Id, Path | ConvertTo-Json`;
      const { stdout } = await execAsync(`powershell -Command "${psCommand}"`);

      if (!stdout.trim()) {
        Logger.info('ovdnd process is not running');
        return { success: true, message: 'Model download process is not running' };
      }

      const processes = JSON.parse(stdout);
      const processList = Array.isArray(processes) ? processes : [processes];
      
      if (processList.length === 0) {
        Logger.info('ovdnd process is not running');
        return { success: true, message: 'Model download process is not running' };
      }

      // Terminate all ovdnd processes
      for (const process of processList) {
        this.terminalProcess(process.Id);
      }

      Logger.info('Model download process stopped successfully');
      return { success: true, message: 'Model download process stopped successfully' };

    } catch (error) {
      Logger.error('Failed to stop model download process:', error);
      return { success: false, message: 'Failed to stop model download process' };
    }
  }

  /**
   * check if the model id exists in the OVMS configuration
   * @param modelId ID of the model to check
   */
  public async checkModelExists(modelId: string): Promise<boolean> {
    const homeDir = homedir();
    const ovmsDir = path.join(homeDir, '.cherrystudio', 'ovms', 'ovms');
    const configPath = path.join(ovmsDir, 'models', 'config.json');
    
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
    const homeDir = homedir();
    const ovmsDir = path.join(homeDir, '.cherrystudio', 'ovms', 'ovms');
    const configPath = path.join(ovmsDir, 'models', 'config.json');

    try {
      
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
    const homeDir = homedir();
    const ovmsDir = path.join(homeDir, '.cherrystudio', 'ovms', 'ovms');
    const configPath = path.join(ovmsDir, 'models', 'config.json');

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
