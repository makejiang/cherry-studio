/**
 * Demonstration script for OvmsManager.addModel method
 * 
 * This script shows how to use the addModel method with the Qwen3-0.6B-int8-ov model.
 * It includes both a simple demo and a comprehensive example with error handling.
 * 
 * Usage:
 * 1. Ensure OVMS is running: ovms.exe --model_repository_path ./models --port 9000
 * 2. Run: npx ts-node src/main/services/demo/OvmsAddModelDemo.ts
 */

import { OvmsManager } from '../src/main/services/OvmsManager'
import Logger from 'electron-log'

// Configure logging for demo
Logger.transports.console.level = 'info'

class OvmsAddModelDemo {
  private ovmsManager: OvmsManager
  private readonly modelId = 'OpenVINO/Qwen3-0.6B-int8-ov'
  private readonly modelName = 'Qwen3-0.6B-int8'

  constructor() {
    this.ovmsManager = new OvmsManager()
  }

  /**
   * testAddModel - just add the model
   */
  async testAddModel(): Promise<Boolean> {
    console.log('🔧 Test AddModel: Adding Qwen3-0.6B-int8-ov model')
    console.log('=' .repeat(50))

    try {
      const startTime = Date.now()

      // Direct model addition
      const result = await this.ovmsManager.addModel('Qwen3-0.6B-int8', 'OpenVINO/Qwen3-0.6B-int8-ov', 600)      
      
      const duration = Date.now() - startTime
      if (result.success) {
        console.log(`✅ Model added successfully in ${duration}ms`)
      } else {
        console.error(`❌ Failed to add model: ${result.message || 'Unknown error'}`)
      }

    } catch (error) {
      console.error('❌ Failed:', error instanceof Error ? error.message : String(error))
      return false
    }

    return true
  }

  /**
   * testCheckModelExists - check if the model exists
   */
  async testCheckModelExists(modelId: string): Promise<Boolean> {
    console.log(`🔍 Test CheckModelExists: Checking ${modelId} model`)
    console.log('=' .repeat(50))

    try {
      const startTime = Date.now()

      const result = await this.ovmsManager.checkModelExists(modelId)

      const duration = Date.now() - startTime

      if (result) {
        console.log(`✅ Model exists in ${duration}ms`)
      } else {
        console.log(`❌ Model does not exist`)
      }

    } catch (error) {
      console.error('❌ Failed:', error instanceof Error ? error.message : String(error))
      return false
    }

    return true
  }
  
  /**
   * testUpdateModelConfig - update the model configuration
   */
  async testUpdateModelConfig(): Promise<Boolean> {
    console.log('🔧 Test UpdateModelConfig: Updating Qwen3-0.6B-int8-ov model configuration')
    console.log('=' .repeat(50))

    try {
      const startTime = Date.now()
      await this.ovmsManager.updateModelConfig(this.modelName, this.modelId)
      const duration = Date.now() - startTime

      console.log(`✅ Model configuration updated successfully in ${duration}ms`)
     
    } catch (error) {
      console.error('❌ Failed:', error instanceof Error ? error.message : String(error))
      return false
    }

    return true
  }

  /**
   * testNameorIdValidetion - validate model name or ID
   * @param modelName
   * @param modelId
   * @returns True if valid, false otherwise
   */
  async testNameorIdValidation(modelName: string, modelId: string): Promise<boolean> {
    console.log(`🔍 Test Name/ID Validation: Validating model name "${modelName}" and ID "${modelId}"`)
    console.log('=' .repeat(50))

    try {
      const result = await this.ovmsManager.isNameAndIDAvalid(modelName, modelId)
      if (result) {
        console.log(`✅ Model name and ID are valid`)
      } else {
        console.log(`❌ Model name or ID is invalid`)
      }
    } catch (error) {
      console.error('❌ Failed:', error instanceof Error ? error.message : String(error))
      return false
    }

    return true
  }
   
}

/**
/**
 * Main execution
 */
async function main() {
  const demo = new OvmsAddModelDemo()
  const args = process.argv.slice(2)
  
  if (args.includes('--add')) {
    await demo.testAddModel()
  }
  else if (args.includes('--check')) {
    await demo.testCheckModelExists("OpenVINO/Qwen2.5-7B-Instruct-1M-int8-ov")
    await demo.testCheckModelExists("mode_not_exists")
  }
  else if (args.includes('--update')) {
    await demo.testUpdateModelConfig()
  }
  else if (args.includes('--validate')) {
    await demo.testNameorIdValidation("Qwen3-0.6B-int8", "OpenVINO/Qwen3-0.6B-int8-o")
  }
}

// Run if executed directly
if (require.main === module) {
  main()
    .then(() => {
      console.log('\n✅ Demo completed successfully')
      process.exit(0)
    })
    .catch(error => {
      console.error('\n❌ Demo failed:', error)
      process.exit(1)
    })
}

//export { OvmsAddModelDemo }
