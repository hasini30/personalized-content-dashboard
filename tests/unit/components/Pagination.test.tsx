import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Pagination } from '@/components/ui/Pagination';

describe('Pagination Component', () => {
  it('renders page info and navigation buttons', () => {
    const handlePageChange = jest.fn();
    render(
      <Pagination
        currentPage={1}
        totalPages={5}
        onPageChange={handlePageChange}
        totalItems={50}
        pageSize={10}
      />
    );

    expect(screen.getByText(/showing/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Page 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Go to previous page')).toBeDisabled();
    expect(screen.getByLabelText('Go to next page')).not.toBeDisabled();
  });

  it('navigates to next page on click', () => {
    const handlePageChange = jest.fn();
    render(<Pagination currentPage={2} totalPages={5} onPageChange={handlePageChange} />);

    const nextBtn = screen.getByLabelText('Go to next page');
    fireEvent.click(nextBtn);
    expect(handlePageChange).toHaveBeenCalledWith(3);

    const prevBtn = screen.getByLabelText('Go to previous page');
    fireEvent.click(prevBtn);
    expect(handlePageChange).toHaveBeenCalledWith(1);
  });

  it('renders ellipsis and windowing for large page counts', () => {
    const handlePageChange = jest.fn();
    render(<Pagination currentPage={5} totalPages={20} onPageChange={handlePageChange} />);

    const ellipses = screen.getAllByText('…');
    expect(ellipses.length).toBeGreaterThan(0);

    const lastBtn = screen.getByLabelText('Go to last page');
    fireEvent.click(lastBtn);
    expect(handlePageChange).toHaveBeenCalledWith(20);
  });

  it('calls onPageSizeChange when selector changes', () => {
    const handlePageSizeChange = jest.fn();
    render(
      <Pagination
        currentPage={1}
        totalPages={5}
        onPageChange={jest.fn()}
        pageSize={12}
        onPageSizeChange={handlePageSizeChange}
      />
    );

    const select = screen.getByLabelText('Select items per page');
    fireEvent.change(select, { target: { value: '24' } });
    expect(handlePageSizeChange).toHaveBeenCalledWith(24);
  });
});
