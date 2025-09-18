import React from 'react';
import { HelloWorld } from '../src/components';

/**
 * Example usage of the HelloWorld component
 * This demonstrates different ways to use the component
 */
const HelloWorldUsageExample: React.FC = () => {
  return (
    <div className="example-container">
      <h2>HelloWorld Component Examples</h2>

      {/* Basic usage */}
      <section>
        <h3>Basic Usage</h3>
        <HelloWorld />
      </section>

      {/* With custom name */}
      <section>
        <h3>With Custom Name</h3>
        <HelloWorld name="Colin" />
      </section>

      {/* With custom styling */}
      <section>
        <h3>With Custom CSS Class</h3>
        <HelloWorld
          name="Tribe MVP Team"
          className="custom-styling"
        />
      </section>
    </div>
  );
};

export default HelloWorldUsageExample;