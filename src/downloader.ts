import * as core from '@actions/core'
import * as tc from '@actions/tool-cache' // https://github.com/actions/toolkit/tree/main/packages/tool-cache
import * as path from 'path'
import * as http from './http'
import * as platform from './platform'

/**
 * Get download url for Vulkan SDK.
 *
 * @export
 * @param {string} version - The SDK version to download.
 * @return {*}  {Promise<string>} Returns the download url.
 */
export async function get_url_vulkan_sdk(version: string): Promise<string> {
  const platformName = platform.getPlatform()

  // For download urls see https://vulkan.lunarg.com/sdk/home

  // Windows:
  // Latest Version: https://sdk.lunarg.com/sdk/download/latest/windows/vulkan-sdk.exe
  // Versionized:    https://sdk.lunarg.com/sdk/download/1.3.216.0/windows/VulkanSDK-1.3.216.0-Installer.exe

  const DOWNLOAD_BASE_URL = `https://sdk.lunarg.com/sdk/download/${version}/${platformName}`

  let VULKAN_SDK_URL = ''

  if (platform.IS_WINDOWS) {
    VULKAN_SDK_URL = `${DOWNLOAD_BASE_URL}/VulkanSDK-${version}-Installer.exe`
  }
  if (platform.IS_LINUX) {
    // For versions up to 1.3.250.1 the ending is ".tar.gz".
    // For versions after 1.3.250.1 the ending is ".tar.xz".
    let extension = 'tar.gz'
    if (1 == compareVersionNumbers(version, '1.3.250.1')) {
      extension = 'tar.xz'
    }
    VULKAN_SDK_URL = `${DOWNLOAD_BASE_URL}/vulkansdk-linux-x86_64-${version}.${extension}`
  }
  if (platform.IS_MAC) {
    VULKAN_SDK_URL = `${DOWNLOAD_BASE_URL}/vulkansdk-macos-${version}.dmg`
  }

  is_downloadable('VULKAN_SDK', version, VULKAN_SDK_URL)

  return VULKAN_SDK_URL
}

/**
 * Get download url for Vulkan Runtime.
 *
 * @export
 * @param {string} version - The runtime version to download.
 * @return {*}  {Promise<string>} Returns the download url.
 */
export async function get_url_vulkan_runtime(version: string): Promise<string> {
  // Windows:
  // Latest Version:  https://sdk.lunarg.com/sdk/download/latest/windows/vulkan-runtime-components.zip
  // Versionized:     https://sdk.lunarg.com/sdk/download/1.3.216.0/windows/VulkanRT-1.3.216.0-Components.zip
  const VULKAN_RUNTIME_URL = `https://sdk.lunarg.com/sdk/download/${version}/windows/vulkan-runtime-components.zip`
  is_downloadable('VULKAN_RUNTIME', version, VULKAN_RUNTIME_URL)
  return VULKAN_RUNTIME_URL
}

/**
 * is_downloadable checks, if an URL returns HTTP Status Code 200.
 * Otherwise, it let's the action fail.
 *
 * @param {string} name - The nice name.
 * @param {string} version - The version of the download.
 * @param {string} url - The URL.
 */
async function is_downloadable(name: string, version: string, url: string) {
  try {
    const HttpClientResponse = await http.client.head(url)
    const statusCode = HttpClientResponse.message.statusCode
    if (statusCode !== undefined) {
      if (statusCode >= 400) {
        core.setFailed(`❌ Http(Error): The requested ${name} ${version} is not downloadable using URL: ${url}.`)
      }
      if (statusCode == 200) {
        core.info(`✔️ Http(200): The requested ${name} ${version} is downloadable.`)
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message)
    }
  }
}

/**
 * Download Vulkan SDK.
 *
 * @export
 * @param {string} version - The version to download.
 * @return {*}  {Promise<string>} Download location.
 */
export async function download_vulkan_sdk(version: string): Promise<string> {
  core.info(`🔽 Downloading Vulkan SDK ${version}`)
  const url = await get_url_vulkan_sdk(version)
  core.info(`    URL: ${url}`)
  const sdk_path = await tc.downloadTool(url, path.join(platform.TEMP_DIR, get_vulkan_sdk_filename(version)))
  core.info(`✔️ Download completed successfully!`)
  core.info(`   File: ${sdk_path}`)
  return sdk_path
}

/**
 * Download Vulkan Runtime (Windows only).
 *
 * @export
 * @param {string} version - The version to download.
 * @return {*}  {Promise<string>} Download location.
 */
export async function download_vulkan_runtime(version: string): Promise<string> {
  core.info(`🔽 Downloading Vulkan Runtime ${version}`)
  const url = await get_url_vulkan_runtime(version)
  core.info(`   URL: ${url}`)
  const runtime_path = await tc.downloadTool(url, path.join(platform.TEMP_DIR, `vulkan-runtime-components.zip`))
  core.info(`✔️ Download completed successfully!`)
  core.info(`    File: ${runtime_path}`)
  return runtime_path
}

/**
 * Returns the platform-based name for the Vulkan SDK archive or installer.
 *
 * @export
 * @param {string} version- The vulkan sdk version number string.
 * @return {*}  {string} Platform-based name for the Vulkan SDK archive or installer.
 */
export function get_vulkan_sdk_filename(version: string): string {
  if (platform.IS_WINDOWS) {
    return `VulkanSDK-Installer.exe`
  }
  if (platform.IS_LINUX) {
    // For versions up to 1.3.250.1 the ending is ".tar.gz".
    // For versions after 1.3.250.1 the ending is ".tar.xz".
    let filename = `vulkansdk-linux-x86_64.tar.gz`
    if (1 == compareVersionNumbers(version, '1.3.250.1')) {
      filename = `vulkansdk-linux-x86_64.tar.xz`
    }
    return filename
  }
  if (platform.IS_MAC) {
    return `vulkansdk-macos.dmg`
  }
  return 'not-implemented-for-platform'
}

/**
 * Compare two version numbers.
 *
 * @param {string} ver1 - The first version number string.
 * @param {string} ver2 - The second version number string.
 * @returns {number} Returns -1 if ver1 is less than ver2, 1 if ver1 is greater than ver2, or 0 if they are equal.
 */
// function compareVersionNumbers(v1: string, v2: string): number {
//   // remove dots and handle strings as integers
//   const int_v1 = parseInt(v1.replace(/\./g, ''))
//   const int_v2 = parseInt(v2.replace(/\./g, ''))

//   // compare the integers
//   if (int_v1 < int_v2) {
//     return -1
//   } else if (int_v1 > int_v2) {
//     return 1
//   } else {
//     return 0
//   }
// }

function compareVersionNumbers(v1: string, v2: string): number {
  const int_arr_v1 = v1.split(".")
  const int_arr_v2 = v2.split(".")

	// Not assuming the split arr len is the same for both versions.
	// Meaning this should work for v1:1.2.345 v2:1.2.345.6 
  for(var i in int_arr_v1)
  { 
		const int_v1 = parseInt(int_arr_v1[i])
		int_v2 = 0
		if (i < int_arr_v2.length) {
			int_v2 = parseInt(int_arr_v2[i])
		}
    if (int_v1 < int_v2) {
      return -1
    } else if (int_v1 > int_v2) {
      return 1
    }
  }
  return 0
}
