import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3"
import { Upload } from "@aws-sdk/lib-storage"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

export const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_MANAGER_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_MANAGER_SECRET_ACCESS_KEY!,
  },
})

export async function uploadToS3(file: File, key: string) {
  const fileBuffer = Buffer.from(await file.arrayBuffer())

  const upload = new Upload({
    client: s3Client,
    params: {
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: key,
      Body: fileBuffer,
      ContentType: file.type,
    },
  })

  return upload.done()
}

export async function getSignedDownloadUrl(key: string) {
  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME!,
    Key: key,
  })

  return getSignedUrl(s3Client, command, { expiresIn: 3600 })
}

/**
 * Create a folder in S3 (folders in S3 are just objects with keys ending in '/')
 */
export async function createS3Folder(folderPath: string) {
  if (!folderPath.endsWith('/')) {
    folderPath = `${folderPath}/`;
  }
  
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME!,
    Key: folderPath,
    Body: ''
  });
  
  return s3Client.send(command);
}

/**
 * Generate the S3 key for a recording based on company, employee, and file
 */
export function generateRecordingKey(companyFolder: string, employeeFolder: string, fileName: string) {
  return `companies/${companyFolder}/employees/${employeeFolder}/recordings/${Date.now()}-${fileName}`;
}
