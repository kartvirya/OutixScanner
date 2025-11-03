const awsConfig = {
  "aws_project_region": "us-east-1",
  "aws_cognito_identity_pool_id": "YOUR_IDENTITY_POOL_ID",
  "aws_cognito_region": "us-east-1",
  "aws_user_pools_id": "YOUR_USER_POOL_ID",
  "aws_user_pools_web_client_id": "YOUR_CLIENT_ID",
  "oauth": {},
  "aws_cognito_username_attributes": [],
  "aws_cognito_social_providers": [],
  "aws_cognito_signup_attributes": [],
  "aws_cognito_mfa_configuration": "OFF",
  "aws_cognito_mfa_types": [],
  "aws_cognito_password_protection_settings": {
    "passwordPolicyMinLength": 8,
    "passwordPolicyCharacters": []
  },
  "aws_cognito_verification_mechanisms": [],
  "aws_user_files_s3_bucket": "YOUR_S3_BUCKET",
  "aws_user_files_s3_region": "us-east-1",
  "aws_user_files_s3_force_path_style": false,
  "aws_mobile_analytics_app_id": "YOUR_ANALYTICS_APP_ID",
  "aws_mobile_analytics_app_region": "us-east-1",
  "aws_cloud_logic_custom": [
    {
      "name": "YOUR_API_NAME",
      "endpoint": "YOUR_API_ENDPOINT",
      "region": "us-east-1"
    }
  ],
  "aws_push_notification_platform": "APNS",
  "aws_push_notification_app_id": "YOUR_APP_ID"
};

export default awsConfig;

