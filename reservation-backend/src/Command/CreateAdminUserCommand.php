<?php

namespace App\Command;

use App\Document\User;
use Doctrine\ODM\MongoDB\DocumentManager;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

#[AsCommand(
    name: 'app:create-admin-user',
    description: 'Create an admin user in the MongoDB database.',
)]
class CreateAdminUserCommand extends Command
{
    public function __construct(
        private readonly DocumentManager $documentManager,
        private readonly UserPasswordHasherInterface $passwordHasher,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        // Keep setup scriptable by accepting credentials as arguments instead of prompting interactively.
        $this
            ->addArgument('email', InputArgument::REQUIRED, 'The admin email address')
            ->addArgument('name', InputArgument::REQUIRED, 'The display name for the admin user')
            ->addArgument('password', InputArgument::REQUIRED, 'The password for the admin user')
            ->addOption('force', null, InputOption::VALUE_NONE, 'Overwrite an existing user with the same email');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        // Normalize CLI input first so accidental surrounding spaces do not create distinct accounts.
        $email = trim((string) $input->getArgument('email'));
        $name = trim((string) $input->getArgument('name'));
        $password = (string) $input->getArgument('password');
        $force = (bool) $input->getOption('force');

        // Fail fast before touching the database when required setup values are missing.
        if (!$email || !$name || !$password) {
            $output->writeln('<error>Email, name, and password are required.</error>');
            return Command::INVALID;
        }

        $existingUser = $this->documentManager->getRepository(User::class)->findOneBy(['email' => $email]);

        // Avoid silently overwriting real accounts unless the operator explicitly requested it.
        if ($existingUser && !$force) {
            $output->writeln(sprintf('<error>User with email "%s" already exists. Use --force to overwrite.</error>', $email));
            return Command::FAILURE;
        }

        // Reuse the existing document when forced so references and IDs remain stable.
        if ($existingUser) {
            $user = $existingUser;
            $output->writeln(sprintf('<comment>Updating existing user "%s" as admin.</comment>', $email));
        } else {
            $user = new User();
            $user->setEmail($email);
            $output->writeln(sprintf('<info>Creating admin user "%s".</info>', $email));
        }

        // Always assign the admin role and rehash the password so the command can repair existing users too.
        $user->setName($name);
        $user->setRoles(['ROLE_ADMIN']);
        $hashedPassword = $this->passwordHasher->hashPassword($user, $password);
        $user->setPassword($hashedPassword);

        $this->documentManager->persist($user);
        $this->documentManager->flush();

        $output->writeln('<info>Admin user created successfully.</info>');

        return Command::SUCCESS;
    }
}
