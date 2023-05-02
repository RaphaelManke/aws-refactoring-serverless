# You Don't Need a Lambda for This: Refactoring Serverless Apps

This repository contains the code used in the presentation titled "You don't need a lambda for this. Refactoring serverless apps." The purpose of this presentation is to showcase refactoring patterns that make AWS Lambda functions redundant and help create a more efficient serverless architecture.

## Overview

The repository is structured as an AWS Cloud Development Kit (CDK) app, with multiple constructs representing the different steps towards a Lambda-less architecture. By exploring these constructs, you'll learn how to refactor your serverless applications to minimize the use of Lambda functions and create more efficient, scalable, and maintainable architectures.


## Repository Structure

The repository is organized into the following directories:

- `lib/`: This folder contains the constructs for each refactoring step.
- `bin/`: This folder contains the main CDK app file, which is responsible for instantiating the constructs and deploying them to AWS.
- `test/`: This folder contains unit tests for the constructs.


## Running Tests

Run the unit tests using the following command:

```
yarn test
```

## Additional Resources

For more information about AWS CDK, AWS Lambda, and serverless architecture, please refer to the following resources:

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/latest/guide/home.html)
- [AWS Lambda Documentation](https://docs.aws.amazon.com/lambda/latest/dg/welcome.html)
- [Serverless Framework](https://www.serverless.com/)

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Acknowledgements

This repository is based on the presentation "You don't need a lambda for this. Refactoring serverless apps." We appreciate the contributions and feedback from the community that helped shape this project.