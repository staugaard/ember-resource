require 'bundler/setup'
require 'pathname'
require 'rake-pipeline'

namespace :dist do

  desc "Build dist/ember-resource.js"
  task :build do
    rm_rf "tmp"
    Rake::Pipeline::Project.new('AssetFile').invoke
  end

  task :clean do
    Rake::Pipeline::Project.new('AssetFile').clean
  end

  task :cleanup_tmpdir do
    Rake::Pipeline::Project.new('AssetFile').cleanup_tmpdir
  end

end

namespace :jasmine do
  task :require do
    require 'jasmine'
  end

  task :require_json do
    begin
      require 'json'
    rescue LoadError
      puts "You must have a JSON library installed to run jasmine:ci. Try \"gem install json\""
      exit
    end
  end

  desc "Run continuous integration tests"
  task :ci => ["jasmine:require_json", "jasmine:require", "dist:build"] do
    if Jasmine::rspec2?
      require "rspec"
      require "rspec/core/rake_task"
    else
      require "spec"
      require 'spec/rake/spectask'
    end

    if Jasmine::rspec2?
      RSpec::Core::RakeTask.new(:jasmine_continuous_integration_runner) do |t|
        t.rspec_opts = ["--colour", "--format", ENV['JASMINE_SPEC_FORMAT'] || "progress"]
        t.verbose = true
        t.pattern = ['spec/javascripts/support/jasmine_runner.rb']
      end
    else
      Spec::Rake::SpecTask.new(:jasmine_continuous_integration_runner) do |t|
        t.spec_opts = ["--color", "--format", ENV['JASMINE_SPEC_FORMAT'] || "specdoc"]
        t.verbose = true
        t.spec_files = ['spec/javascripts/support/jasmine_runner.rb']
      end
    end
    Rake::Task["jasmine_continuous_integration_runner"].invoke
  end

  task :server => ["jasmine:require", "dist:build"] do
    jasmine_config_overrides = File.join(Jasmine::Config.new.project_root, 'spec', 'javascripts' ,'support' ,'jasmine_config.rb')
    require jasmine_config_overrides if File.exist?(jasmine_config_overrides)

    port = ENV['JASMINE_PORT'] || 8888
    puts "your tests are here:"
    puts "  http://localhost:#{port}/"
    Jasmine::Config.new.start_server(port)
  end
end

desc "Run specs via server"
task :jasmine => ['jasmine:server']


require 'jshint/tasks'
JSHint.config_path = 'jshint.yml'


task :default => ['jshint', 'jasmine:ci']
