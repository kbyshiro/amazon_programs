# -- coding: utf-8 --
import json
import boto3
import sys
def lambda_handler(event, context):
   print(event)
   '''
   sbucket: source bucket name
   tbucket: target bucket name
   collectioId : face collection name
   '''
   # set instance
   s3 = boto3.resource('s3', region_name='us-east-1')
   rekognition = boto3.client('rekognition', region_name='us-east-1')
  
   # set bucket name
   sbucket = "source-face-bucket"
   tbucket = "target-face-bucket"
   collectionId = 'face-collection'
   threshold = 85
   
   # make face-collleciton
   list = rekognition.list_collections()
   if collectionId in list['CollectionIds'] == False:
     rekognition.create_collection(CollectionId = collectionId)
     print('creation success')
   else:
     pass
   
   #update or search face-collection
   if event['Records'][0]['s3']['bucket']['name'] == sbucket:
     fileName = event['Records'][0]['s3']['object']['key']
     update_face_collection(fileName, rekognition,sbucket,collectionId)
     face_list = rekognition.list_faces(CollectionId=collectionId)
     print(face_list)
   
   elif event['Records'][0]['s3']['bucket']['name'] == tbucket:
     fileName = event['Records'][0]['s3']['object']['key']
     print(tbucket)
     print(fileName)
     try:
       response=rekognition.search_faces_by_image(CollectionId=collectionId,
                                 Image={'S3Object':{'Bucket':tbucket,'Name':fileName}},
                                 FaceMatchThreshold=threshold
                                 )
       if response['FaceMatches'][0] == None:
         print("Not Match!")
       else:
         result = call(response)
         print(response['FaceMatches'][0]['Face']['ExternalImageId'])
         print(type(result))
     
     except Exception as e:
       print(e.args)
       print("There are no face!")
   
     # call state_write
   else:
     print('Error')
   face_list = rekognition.list_faces(CollectionId=collectionId)
   return face_list, { "status_code" : 200 }


def update_face_collection(fileName,rekognition, bucket, collectionId):
   '''
   key: photo name
   bucket = s3.Bucket(sbucket)
   objs = bucket.meta.client.list_objects_v2(Bucket=bucket.name)
   contents = objs.get('Contents')
   '''
   index=rekognition.index_faces
   index = rekognition.index_faces(CollectionId=collectionId,
                               Image={'S3Object':{'Bucket':bucket,'Name':fileName}},
                               ExternalImageId=fileName,
                               MaxFaces=1,
                               QualityFilter="AUTO",
                               DetectionAttributes=['ALL'])

def call(response):
   clientLambda = boto3.client("lambda")
   payload = json.dumps(response)
   print('dumps'+ payload)
   print(type(payload))
   result = clientLambda.invoke(
         FunctionName="state_read",
         InvocationType="RequestResponse",
         Payload=payload
     )
   return result